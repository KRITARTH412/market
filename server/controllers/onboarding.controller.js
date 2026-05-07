import Organization from '../models/Organization.model.js';
import User from '../models/User.model.js';

/**
 * Get onboarding status for organization
 */
export const getOnboardingStatus = async (req, res) => {
  try {
    const org = await Organization.findById(req.organizationId);
    
    if (!org) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }
    
    res.json({
      completed: org.onboarding?.completed || false,
      currentStep: org.onboarding?.currentStep || 1,
      steps: {
        organization: org.onboarding?.steps?.organization || false,
        team: org.onboarding?.steps?.team || false,
        project: org.onboarding?.steps?.project || false,
        tour: org.onboarding?.steps?.tour || false,
        settings: org.onboarding?.steps?.settings || false
      },
      skipped: org.onboarding?.skipped || false,
      completedAt: org.onboarding?.completedAt || null
    });
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    res.status(500).json({
      error: 'Failed to get onboarding status'
    });
  }
};

/**
 * Update onboarding step
 */
export const updateOnboardingStep = async (req, res) => {
  try {
    const { step, data } = req.body;
    
    const validSteps = ['organization', 'team', 'project', 'tour', 'settings'];
    
    if (!validSteps.includes(step)) {
      return res.status(400).json({
        error: 'Invalid step. Must be one of: ' + validSteps.join(', ')
      });
    }
    
    const org = await Organization.findById(req.organizationId);
    
    if (!org) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }
    
    // Initialize onboarding if not exists
    if (!org.onboarding) {
      org.onboarding = {
        completed: false,
        currentStep: 1,
        steps: {
          organization: false,
          team: false,
          project: false,
          tour: false,
          settings: false
        },
        skipped: false,
        completedAt: null
      };
    }
    
    // Mark step as completed
    org.onboarding.steps[step] = true;
    
    // Update current step
    const stepIndex = validSteps.indexOf(step);
    if (stepIndex + 1 > org.onboarding.currentStep) {
      org.onboarding.currentStep = stepIndex + 2; // Next step (1-indexed)
    }
    
    // Check if all steps are completed
    const allCompleted = validSteps.every(s => org.onboarding.steps[s]);
    if (allCompleted) {
      org.onboarding.completed = true;
      org.onboarding.completedAt = new Date();
    }
    
    // Process step-specific data
    if (data) {
      if (step === 'organization') {
        if (data.logoUrl) org.logoUrl = data.logoUrl;
        if (data.primaryColor) org.primaryColor = data.primaryColor;
      }
    }
    
    await org.save();
    
    res.json({
      success: true,
      message: 'Onboarding step updated',
      onboarding: {
        completed: org.onboarding.completed,
        currentStep: org.onboarding.currentStep,
        steps: org.onboarding.steps
      }
    });
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    res.status(500).json({
      error: 'Failed to update onboarding step'
    });
  }
};

/**
 * Skip onboarding
 */
export const skipOnboarding = async (req, res) => {
  try {
    const org = await Organization.findById(req.organizationId);
    
    if (!org) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }
    
    // Initialize onboarding if not exists
    if (!org.onboarding) {
      org.onboarding = {
        completed: false,
        currentStep: 1,
        steps: {
          organization: false,
          team: false,
          project: false,
          tour: false,
          settings: false
        },
        skipped: false,
        completedAt: null
      };
    }
    
    org.onboarding.skipped = true;
    org.onboarding.completed = true;
    org.onboarding.completedAt = new Date();
    
    await org.save();
    
    res.json({
      success: true,
      message: 'Onboarding skipped'
    });
  } catch (error) {
    console.error('Error skipping onboarding:', error);
    res.status(500).json({
      error: 'Failed to skip onboarding'
    });
  }
};

/**
 * Restart onboarding
 */
export const restartOnboarding = async (req, res) => {
  try {
    const org = await Organization.findById(req.organizationId);
    
    if (!org) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }
    
    org.onboarding = {
      completed: false,
      currentStep: 1,
      steps: {
        organization: false,
        team: false,
        project: false,
        tour: false,
        settings: false
      },
      skipped: false,
      completedAt: null
    };
    
    await org.save();
    
    res.json({
      success: true,
      message: 'Onboarding restarted',
      onboarding: org.onboarding
    });
  } catch (error) {
    console.error('Error restarting onboarding:', error);
    res.status(500).json({
      error: 'Failed to restart onboarding'
    });
  }
};

/**
 * Get tour steps
 */
export const getTourSteps = async (req, res) => {
  try {
    const tourSteps = [
      {
        id: 1,
        title: 'Dashboard Overview',
        description: 'Your central hub for all activities',
        target: '#dashboard',
        content: 'The dashboard shows key metrics, recent activities, and quick actions.'
      },
      {
        id: 2,
        title: 'Projects',
        description: 'Manage your real estate projects',
        target: '#projects',
        content: 'Create and manage projects, upload documents, and track progress.'
      },
      {
        id: 3,
        title: 'AI Chat',
        description: 'Chat with your project documents',
        target: '#chat',
        content: 'Ask questions about your projects and get instant answers from your documents.'
      },
      {
        id: 4,
        title: 'Global Bot',
        description: 'Access all organization knowledge',
        target: '#global-bot',
        content: 'The Global Bot has access to all projects in your organization.'
      },
      {
        id: 5,
        title: 'Lead Management',
        description: 'Track and manage your leads',
        target: '#leads',
        content: 'Capture, qualify, and convert leads with our powerful CRM.'
      },
      {
        id: 6,
        title: 'Analytics',
        description: 'Insights and reports',
        target: '#analytics',
        content: 'View detailed analytics about your projects, leads, and team performance.'
      },
      {
        id: 7,
        title: 'Team Management',
        description: 'Manage your team members',
        target: '#team',
        content: 'Invite team members, assign roles, and manage permissions.'
      }
    ];
    
    res.json({
      steps: tourSteps
    });
  } catch (error) {
    console.error('Error getting tour steps:', error);
    res.status(500).json({
      error: 'Failed to get tour steps'
    });
  }
};

/**
 * Complete tour
 */
export const completeTour = async (req, res) => {
  try {
    const org = await Organization.findById(req.organizationId);
    
    if (!org) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }
    
    // Initialize onboarding if not exists
    if (!org.onboarding) {
      org.onboarding = {
        completed: false,
        currentStep: 1,
        steps: {
          organization: false,
          team: false,
          project: false,
          tour: false,
          settings: false
        },
        skipped: false,
        completedAt: null
      };
    }
    
    org.onboarding.steps.tour = true;
    
    await org.save();
    
    res.json({
      success: true,
      message: 'Tour completed'
    });
  } catch (error) {
    console.error('Error completing tour:', error);
    res.status(500).json({
      error: 'Failed to complete tour'
    });
  }
};
