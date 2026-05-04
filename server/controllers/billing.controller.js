import { validationResult } from 'express-validator';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Organization from '../models/Organization.model.js';
import { createAuditLog } from '../middleware/auditLog.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Lazy-load Razorpay client
let razorpay = null;

const getRazorpayClient = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay environment variables are not set');
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpay;
};

const PLANS = {
  basic: {
    name: 'Basic',
    price: 999,
    limits: {
      maxUsers: 2,
      maxDocuments: 20,
      maxProjects: 5,
      monthlyQueryLimit: 500,
      maxStorageBytes: 104857600 // 100MB
    }
  },
  pro: {
    name: 'Pro',
    price: 2999,
    limits: {
      maxUsers: 10,
      maxDocuments: 100,
      maxProjects: 50,
      monthlyQueryLimit: 5000,
      maxStorageBytes: 1073741824 // 1GB
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 7999,
    limits: {
      maxUsers: 999999,
      maxDocuments: 999999,
      maxProjects: 999999,
      monthlyQueryLimit: 999999,
      maxStorageBytes: 107374182400 // 100GB
    }
  }
};

export const getPlans = asyncHandler(async (req, res) => {
  res.json({ plans: PLANS });
});

export const createSubscription = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { plan } = req.body;

  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const planDetails = PLANS[plan];

  // Create Razorpay subscription
  const razorpayClient = getRazorpayClient();
  const subscription = await razorpayClient.subscriptions.create({
    plan_id: `plan_${plan}`, // You need to create plans in Razorpay dashboard
    customer_notify: 1,
    total_count: 12, // 12 months
    quantity: 1,
    notes: {
      organizationId: req.organizationId.toString()
    }
  });

  // Update organization
  const organization = await Organization.findById(req.organizationId);
  organization.plan = plan;
  organization.limits = planDetails.limits;
  organization.subscription.razorpaySubscriptionId = subscription.id;
  organization.subscription.status = 'active';
  organization.subscription.currentPeriodEnd = new Date(subscription.current_end * 1000);
  await organization.save();

  await createAuditLog('subscription.change', req, { plan }, 'subscription', organization._id);

  res.json({
    message: 'Subscription created successfully',
    subscription: {
      id: subscription.id,
      plan,
      status: subscription.status,
      shortUrl: subscription.short_url
    }
  });
});

export const updateSubscription = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { plan } = req.body;

  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const organization = await Organization.findById(req.organizationId);
  const oldPlan = organization.plan;

  // Update plan
  organization.plan = plan;
  organization.limits = PLANS[plan].limits;
  await organization.save();

  await createAuditLog('subscription.change', req, { oldPlan, newPlan: plan }, 'subscription', organization._id);

  res.json({
    message: 'Subscription updated successfully',
    plan
  });
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.organizationId);

  if (organization.subscription.razorpaySubscriptionId) {
    const razorpayClient = getRazorpayClient();
    await razorpayClient.subscriptions.cancel(organization.subscription.razorpaySubscriptionId);
  }

  organization.subscription.status = 'cancelled';
  await organization.save();

  await createAuditLog('subscription.cancel', req, {}, 'subscription', organization._id);

  res.json({ message: 'Subscription cancelled successfully' });
});

export const getInvoices = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.organizationId);

  if (!organization.subscription.razorpaySubscriptionId) {
    return res.json({ invoices: [] });
  }

  const razorpayClient = getRazorpayClient();
  const invoices = await razorpayClient.invoices.all({
    subscription_id: organization.subscription.razorpaySubscriptionId
  });

  res.json({ invoices: invoices.items });
});

export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body.toString();

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(body);

  // Handle different events
  switch (event.event) {
    case 'subscription.activated':
      await handleSubscriptionActivated(event.payload.subscription.entity);
      break;
    case 'subscription.charged':
      await handleSubscriptionCharged(event.payload.payment.entity);
      break;
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(event.payload.subscription.entity);
      break;
    case 'subscription.expired':
      await handleSubscriptionExpired(event.payload.subscription.entity);
      break;
  }

  res.json({ status: 'ok' });
});

async function handleSubscriptionActivated(subscription) {
  const organizationId = subscription.notes.organizationId;
  const organization = await Organization.findById(organizationId);
  
  if (organization) {
    organization.subscription.status = 'active';
    organization.subscription.currentPeriodEnd = new Date(subscription.current_end * 1000);
    await organization.save();
  }
}

async function handleSubscriptionCharged(payment) {
  // Log payment for invoice generation
  console.log('Payment received:', payment);
}

async function handleSubscriptionCancelled(subscription) {
  const organizationId = subscription.notes.organizationId;
  const organization = await Organization.findById(organizationId);
  
  if (organization) {
    organization.subscription.status = 'cancelled';
    await organization.save();
  }
}

async function handleSubscriptionExpired(subscription) {
  const organizationId = subscription.notes.organizationId;
  const organization = await Organization.findById(organizationId);
  
  if (organization) {
    organization.subscription.status = 'expired';
    await organization.save();
  }
}
