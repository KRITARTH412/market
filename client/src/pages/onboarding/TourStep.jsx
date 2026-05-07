import { useState, useEffect } from 'react';
import { Compass, LayoutDashboard, FolderOpen, MessageSquare, Users as UsersIcon, BarChart3, Settings } from 'lucide-react';
import Button from '../../components/Button';
import { api } from '../../lib/api';

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Your central hub for all activities, metrics, and quick actions'
  },
  {
    icon: FolderOpen,
    title: 'Projects',
    description: 'Create and manage real estate projects with document organization'
  },
  {
    icon: MessageSquare,
    title: 'AI Chat',
    description: 'Chat with your documents using AI to get instant answers'
  },
  {
    icon: MessageSquare,
    title: 'Global Bot',
    description: 'Access knowledge from all projects across your organization'
  },
  {
    icon: UsersIcon,
    title: 'Lead Management',
    description: 'Track, qualify, and convert leads with our powerful CRM'
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'View insights about projects, leads, and team performance'
  },
  {
    icon: Settings,
    title: 'Team & Settings',
    description: 'Manage team members, roles, and organization settings'
  }
];

export default function TourStep({ onNext, onBack }) {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  const handleNext = () => {
    if (currentFeature < FEATURES.length - 1) {
      setCurrentFeature(currentFeature + 1);
    } else {
      completeTour();
    }
  };
  
  const handlePrevious = () => {
    if (currentFeature > 0) {
      setCurrentFeature(currentFeature - 1);
    }
  };
  
  const completeTour = async () => {
    try {
      await api.post('/onboarding/tour/complete');
      onNext({ completed: true });
    } catch (error) {
      console.error('Error completing tour:', error);
      onNext({ completed: true });
    }
  };
  
  const handleSkip = () => {
    onNext({ skipped: true });
  };
  
  const feature = FEATURES[currentFeature];
  const Icon = feature.icon;
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Compass className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Feature Tour
        </h2>
        <p className="text-gray-600">
          Let's explore what PropMind can do for you
        </p>
      </div>
      
      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {FEATURES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentFeature(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentFeature
                ? 'bg-blue-600 w-8'
                : index < currentFeature
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      
      {/* Feature Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 mb-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-6">
            <Icon className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {feature.title}
          </h3>
          <p className="text-lg text-gray-600">
            {feature.description}
          </p>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={currentFeature === 0 ? onBack : handlePrevious}
        >
          {currentFeature === 0 ? 'Back' : 'Previous'}
        </Button>
        
        <div className="text-sm text-gray-500">
          {currentFeature + 1} of {FEATURES.length}
        </div>
        
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip Tour
          </Button>
          <Button type="button" onClick={handleNext}>
            {currentFeature === FEATURES.length - 1 ? 'Finish Tour' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
