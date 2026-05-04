import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

// Send email function
export const sendEmail = async (to, subject, html, text = null) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Email templates
export const emailTemplates = {
  invitation: (organizationName, inviterName, inviteLink) => ({
    subject: `You've been invited to join ${organizationName} on PropMind AI`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to PropMind AI!</h2>
        <p>${inviterName} has invited you to join <strong>${organizationName}</strong> on PropMind AI.</p>
        <p>PropMind AI is an AI-powered real estate platform that helps you manage properties, engage leads, and close deals faster.</p>
        <p style="margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
        <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `
  }),

  passwordReset: (resetLink) => ({
    subject: 'Reset your PropMind AI password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password for your PropMind AI account.</p>
        <p style="margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
      </div>
    `
  }),

  emailVerification: (verificationLink) => ({
    subject: 'Verify your PropMind AI email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        <p>Thank you for signing up for PropMind AI! Please verify your email address to get started.</p>
        <p style="margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
      </div>
    `
  }),

  documentProcessingFailed: (fileName, error) => ({
    subject: 'Document processing failed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Document Processing Failed</h2>
        <p>We encountered an error while processing your document: <strong>${fileName}</strong></p>
        <p style="color: #DC2626; background-color: #FEE2E2; padding: 12px; border-radius: 6px;">
          Error: ${error}
        </p>
        <p>Please try uploading the document again or contact support if the issue persists.</p>
      </div>
    `
  }),

  subscriptionRenewal: (organizationName, plan, renewalDate, amount) => ({
    subject: 'Your PropMind AI subscription will renew soon',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Subscription Renewal Reminder</h2>
        <p>Your <strong>${plan}</strong> plan for ${organizationName} will automatically renew on <strong>${renewalDate}</strong>.</p>
        <p>Amount: <strong>₹${amount}</strong></p>
        <p>If you wish to make any changes to your subscription, please visit your billing settings.</p>
        <p style="margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/billing" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Manage Subscription
          </a>
        </p>
      </div>
    `
  }),

  leadAssignment: (agentName, leadName, leadPhone) => ({
    subject: 'New lead assigned to you',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Lead Assignment</h2>
        <p>Hi ${agentName},</p>
        <p>A new lead has been assigned to you:</p>
        <div style="background-color: #F3F4F6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Name:</strong> ${leadName}</p>
          <p><strong>Phone:</strong> ${leadPhone}</p>
        </div>
        <p style="margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/leads" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Lead Details
          </a>
        </p>
      </div>
    `
  })
};
