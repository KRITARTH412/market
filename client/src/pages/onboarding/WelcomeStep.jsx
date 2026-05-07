import { useState } from 'react';
import { Building2, Palette, Upload } from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function WelcomeStep({ data, onNext, isFirstStep }) {
  const [formData, setFormData] = useState({
    industryType: data.industryType || '',
    companySize: data.companySize || '',
    primaryColor: data.primaryColor || '#3B82F6',
    ...data
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(formData);
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Building2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to PropMind!
        </h2>
        <p className="text-gray-600">
          Let's personalize your experience. Tell us a bit about your organization.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Industry Type
          </label>
          <select
            value={formData.industryType}
            onChange={(e) => setFormData({ ...formData, industryType: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select industry</option>
            <option value="real-estate">Real Estate</option>
            <option value="property-management">Property Management</option>
            <option value="construction">Construction</option>
            <option value="consulting">Consulting</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Size
          </label>
          <select
            value={formData.companySize}
            onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select size</option>
            <option value="1-10">1-10 employees</option>
            <option value="11-50">11-50 employees</option>
            <option value="51-200">51-200 employees</option>
            <option value="201-500">201-500 employees</option>
            <option value="500+">500+ employees</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Palette className="w-4 h-4 inline mr-2" />
            Brand Color
          </label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={formData.primaryColor}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              className="w-20 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <Input
              type="text"
              value={formData.primaryColor}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              placeholder="#3B82F6"
              className="flex-1"
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Choose a color that represents your brand
          </p>
        </div>
        
        <div className="flex justify-end pt-6">
          <Button type="submit" size="lg">
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
