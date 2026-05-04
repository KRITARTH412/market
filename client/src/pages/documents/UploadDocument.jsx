import { useState } from 'react';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import Button from '../../components/Button';
import FileUpload from '../../components/FileUpload';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const UploadDocument = ({ isOpen, onClose, onSuccess, projects }) => {
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('file', file);
      });
      formData.append('projectId', selectedProject);

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess(response.data.documents);
      
      // Reset form
      setSelectedProject('');
      setSelectedFiles([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Documents" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Select
          label="Select Project"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          options={[
            { value: '', label: 'Select a project...' },
            ...projects.map(p => ({ value: p._id, label: p.name })),
          ]}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Files
          </label>
          <FileUpload
            onFilesSelected={setSelectedFiles}
            accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.jpg,.jpeg,.png"
            multiple
            maxSize={50 * 1024 * 1024} // 50MB
          />
          <p className="mt-2 text-sm text-gray-500">
            Supported formats: PDF, DOC, DOCX, TXT, MP3, WAV, JPG, PNG (Max 50MB per file)
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">What happens after upload?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Documents are processed and analyzed</li>
            <li>• Content is vectorized for AI search</li>
            <li>• AI agents can reference these documents in conversations</li>
            <li>• Processing may take a few minutes depending on file size</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UploadDocument;
