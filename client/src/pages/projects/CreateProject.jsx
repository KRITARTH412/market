import { useState } from 'react';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const CreateProject = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    location: {
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
    specifications: {
      bhkTypes: [],
      priceRange: {
        min: '',
        max: '',
      },
      totalUnits: '',
      availableUnits: '',
      amenities: [],
    },
  });

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert string numbers to integers
      const payload = {
        ...formData,
        specifications: {
          ...formData.specifications,
          priceRange: {
            min: parseInt(formData.specifications.priceRange.min),
            max: parseInt(formData.specifications.priceRange.max),
          },
          totalUnits: parseInt(formData.specifications.totalUnits),
          availableUnits: parseInt(formData.specifications.availableUnits),
          bhkTypes: formData.specifications.bhkTypes.filter(Boolean),
          amenities: formData.specifications.amenities.filter(Boolean),
        },
      };

      const response = await api.post('/projects', payload);
      onSuccess(response.data.project);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        status: 'active',
        location: { address: '', city: '', state: '', pincode: '' },
        specifications: {
          bhkTypes: [],
          priceRange: { min: '', max: '' },
          totalUnits: '',
          availableUnits: '',
          amenities: [],
        },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="Enter project name"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter project description"
            />
          </div>

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>

        {/* Location */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Location</h3>
          
          <Input
            label="Address"
            value={formData.location.address}
            onChange={(e) => handleChange('location.address', e.target.value)}
            placeholder="Enter address"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={formData.location.city}
              onChange={(e) => handleChange('location.city', e.target.value)}
              required
              placeholder="Enter city"
            />

            <Input
              label="State"
              value={formData.location.state}
              onChange={(e) => handleChange('location.state', e.target.value)}
              required
              placeholder="Enter state"
            />
          </div>

          <Input
            label="Pincode"
            value={formData.location.pincode}
            onChange={(e) => handleChange('location.pincode', e.target.value)}
            placeholder="Enter pincode"
          />
        </div>

        {/* Specifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Specifications</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BHK Types (comma separated)
            </label>
            <input
              type="text"
              value={formData.specifications.bhkTypes.join(', ')}
              onChange={(e) => handleChange('specifications', {
                ...formData.specifications,
                bhkTypes: e.target.value.split(',').map(s => s.trim()),
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1BHK, 2BHK, 3BHK"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Price"
              type="number"
              value={formData.specifications.priceRange.min}
              onChange={(e) => handleChange('specifications', {
                ...formData.specifications,
                priceRange: {
                  ...formData.specifications.priceRange,
                  min: e.target.value,
                },
              })}
              placeholder="Minimum price"
            />

            <Input
              label="Max Price"
              type="number"
              value={formData.specifications.priceRange.max}
              onChange={(e) => handleChange('specifications', {
                ...formData.specifications,
                priceRange: {
                  ...formData.specifications.priceRange,
                  max: e.target.value,
                },
              })}
              placeholder="Maximum price"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total Units"
              type="number"
              value={formData.specifications.totalUnits}
              onChange={(e) => handleChange('specifications', {
                ...formData.specifications,
                totalUnits: e.target.value,
              })}
              placeholder="Total units"
            />

            <Input
              label="Available Units"
              type="number"
              value={formData.specifications.availableUnits}
              onChange={(e) => handleChange('specifications', {
                ...formData.specifications,
                availableUnits: e.target.value,
              })}
              placeholder="Available units"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amenities (comma separated)
            </label>
            <input
              type="text"
              value={formData.specifications.amenities.join(', ')}
              onChange={(e) => handleChange('specifications', {
                ...formData.specifications,
                amenities: e.target.value.split(',').map(s => s.trim()),
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Swimming Pool, Gym, Parking"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateProject;
