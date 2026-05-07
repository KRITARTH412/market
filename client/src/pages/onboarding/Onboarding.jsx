import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle } from 'lucide-react';
import { api } from '../../lib/api';
import WelcomeStep from './WelcomeStep';
import TeamStep from './TeamStep';
import ProjectStep from './ProjectStep';
import TourStep from './TourStep';
import SettingsStep from './SettingsStep';
import Button from '../../components/Button';

const STEPS = [
  { id: 1, key: 'organization', title: 'Welcome', component: WelcomeStep },
  { id: 2, key: 'team', title: 'Team Setup', component: TeamStep },
  { id: 3, key: 'project', title: 'First Project', component: ProjectStep },
  { id: 4, key: 'tour', title: 'Feature Tour', component: TourStep },
  { id: 5, key: 'settings', title: 'Settings', component: SettingsStep }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState({});
  const [onboardingData, setOnboardingData] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchOnboardingStatus();
  }, []);
  
  const fetchOnboardingStatus = async () => {
    try {
      const response = await api.get('/onboarding/status');
      
      if (response.data.completed) {
        // Already completed, redirect to dashboard
        navigate('/dashboard');
        return;
      }
      
      setCurrentStep(response.data.currentStep || 1);
      setCompletedSteps(response.data.steps || {});
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleNext = async (stepData) => {
    const currentStepKey = STEPS[currentStep - 1].key;
    
    // Save step data
    setOnboardingData(prev => ({
      ...prev,
      [currentStepKey]: stepData
    }));
    
    try {
      // Mark step as completed
      await api.post('/onboarding/step', {
        step: currentStepKey,
        data: stepData
      });
      
      setCompletedSteps(prev => ({
        ...prev,
        [currentStepKey]: true
      }));
      
      // Move to next step or complete
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      } else {
        // All steps completed
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving onboarding step:', error);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSkip = async () => {
    if (!confirm('Are you sure you want to skip the onboarding? You can restart it later from settings.')) {
      return;
    }
    
    try {
      await api.post('/onboarding/skip');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  const CurrentStepComponent = STEPS[currentStep - 1].component;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PropMind Setup</h1>
              <p className="text-sm text-gray-500 mt-1">
                Let's get you started with PropMind
              </p>
            </div>
            <Button variant="ghost" onClick={handleSkip}>
              Skip Setup
            </Button>
          </div>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    completedSteps[step.key]
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {completedSteps[step.key] ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    currentStep === step.id
                      ? 'text-blue-600'
                      : completedSteps[step.key]
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 transition-colors ${
                    completedSteps[step.key]
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        
        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <CurrentStepComponent
            data={onboardingData[STEPS[currentStep - 1].key] || {}}
            onNext={handleNext}
            onBack={handleBack}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === STEPS.length}
          />
        </div>
      </div>
    </div>
  );
}
