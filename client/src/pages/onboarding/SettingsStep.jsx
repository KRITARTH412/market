import { useState } from 'react';
import { Settings as SettingsIcon, Bell, Mail, CheckCircle } from 'lucide-react';
import Button from '../../components/Button';

export default function SettingsStep({ data, onNext, onBack }) {
  const [formData, setFormData] = useState({
    emailNotifications: data.emailNotifications !== false,
    leadNotifications: data.leadNotifications !== false,
    weeklyReports: data.weeklyReports !== false,
    ...data
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(formData);
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <SettingsIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Notification Preferences
        </h2>
        <p className="text-gray-600">
          Choose how you want to stay updated
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Email Notifications
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Receive email updates about important activities
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, emailNotifications: !formData.emailNotifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Lead Notifications */}
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Lead Notifications
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Get notified when new leads are assigned to you
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, leadNotifications: !formData.leadNotifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.leadNotifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.leadNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Weekly Reports */}
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-3">
              <BarChart3 className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Weekly Reports
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Receive weekly summary of your activities and metrics
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, weeklyReports: !formData.weeklyReports })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.weeklyReports ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.weeklyReports ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900 mb-1">
                You're All Set!
              </h4>
              <p className="text-sm text-green-700">
                You can always change these settings later from your account settings.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" size="lg">
            Complete Setup
          </Button>
        </div>
      </form>
    </div>
  );
}

// Missing import
import { BarChart3 } from 'lucide-react';
