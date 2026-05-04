import Organization from '../models/Organization.model.js';

// Check if organization can upload documents
export const checkDocumentLimit = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!organization.canUploadDocument()) {
      return res.status(402).json({
        error: 'Document limit exceeded',
        message: `You have reached your plan limit of ${organization.limits.maxDocuments} documents. Please upgrade your plan.`,
        current: organization.usage.documentCount,
        limit: organization.limits.maxDocuments
      });
    }

    req.organization = organization;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check document limit' });
  }
};

// Check if organization can add users
export const checkUserLimit = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!organization.canAddUser()) {
      return res.status(402).json({
        error: 'User limit exceeded',
        message: `You have reached your plan limit of ${organization.limits.maxUsers} users. Please upgrade your plan.`,
        current: organization.usage.userCount,
        limit: organization.limits.maxUsers
      });
    }

    req.organization = organization;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check user limit' });
  }
};

// Check if organization can add projects
export const checkProjectLimit = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!organization.canAddProject()) {
      return res.status(402).json({
        error: 'Project limit exceeded',
        message: `You have reached your plan limit of ${organization.limits.maxProjects} projects. Please upgrade your plan.`,
        current: organization.usage.projectCount,
        limit: organization.limits.maxProjects
      });
    }

    req.organization = organization;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check project limit' });
  }
};

// Check if organization can make AI queries
export const checkQueryLimit = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!organization.canMakeQuery()) {
      return res.status(402).json({
        error: 'Query limit exceeded',
        message: `You have reached your monthly query limit of ${organization.limits.monthlyQueryLimit}. Please upgrade your plan.`,
        current: organization.usage.monthlyQueryCount,
        limit: organization.limits.monthlyQueryLimit
      });
    }

    req.organization = organization;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check query limit' });
  }
};

// Check if organization can upload file based on storage
export const checkStorageLimit = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const fileSize = req.file?.size || 0;
    
    if (!organization.canUploadFile(fileSize)) {
      const limitMB = (organization.limits.maxStorageBytes / (1024 * 1024)).toFixed(2);
      const usedMB = (organization.usage.storageBytes / (1024 * 1024)).toFixed(2);
      
      return res.status(402).json({
        error: 'Storage limit exceeded',
        message: `You have reached your storage limit of ${limitMB} MB. Please upgrade your plan.`,
        current: `${usedMB} MB`,
        limit: `${limitMB} MB`
      });
    }

    req.organization = organization;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check storage limit' });
  }
};

// Check subscription status
export const checkSubscriptionStatus = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const status = organization.subscription.status;
    
    if (status === 'expired' || status === 'cancelled') {
      return res.status(402).json({
        error: 'Subscription inactive',
        message: 'Your subscription has expired or been cancelled. Please renew to continue using the platform.',
        status
      });
    }

    // Check if trial has ended
    if (status === 'trial' && organization.subscription.trialEndsAt < new Date()) {
      organization.subscription.status = 'expired';
      await organization.save();
      
      return res.status(402).json({
        error: 'Trial expired',
        message: 'Your trial period has ended. Please subscribe to a plan to continue.',
        status: 'expired'
      });
    }

    req.organization = organization;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check subscription status' });
  }
};
