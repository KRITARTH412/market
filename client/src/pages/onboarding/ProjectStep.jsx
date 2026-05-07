import { useState } from 'react';
import { FolderPlus, FileText } from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function ProjectStep({ data, onNext, onBack }) {
  const [formData, setFormData] = useState({
    projectName: data.projectName || '',
    projectDescription: data.projectDescription || '',
    ...data
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(formData);
  };
  
  const handleSkipStep = () => {
    onNext({ skipped: true });
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <FolderPlus className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Create Your First Project
        </h2>
        <p className="text-gray-600">
          Projects help you organize documents and conversations
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <Input
            type="text"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            placeholder="e.g., Skyline Tower"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.projectDescription}
            onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
            placeholder="Brief description of your project..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Pro Tip
              </h4>
              <p className="text-sm text-blue-700">
                After creating your project, you can upload documents and start chatting with your AI assistant about them.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={handleSkipStep}>
              Skip for Now
            </Button>
            <Button type="submit">
              Create Project
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
