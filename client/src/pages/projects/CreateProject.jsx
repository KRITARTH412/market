import { useState, useMemo } from 'react';
import { Plus, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const CreateProject = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    coverImage: null,
    images: [],
    location: {
      country: '',
      state: '',
      city: '',
      pincode: '',
      address: '',
    },
    bhkConfigurations: [],
    amenities: [],
  });

  // BHK configuration template
  const [newBhkConfig, setNewBhkConfig] = useState({
    type: '1BHK',
    totalUnits: '',
    availableUnits: '',
    priceMin: '',
    priceMax: '',
    carpetAreaMin: '',
    carpetAreaMax: '',
  });

  const bhkTypeOptions = ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'Studio', 'Penthouse'];
  
  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'under_construction', label: 'Under Construction' },
    { value: 'ready_to_move', label: 'Ready to Move' },
    { value: 'completed', label: 'Completed' },
  ];

  const commonAmenities = [
    'Swimming Pool', 'Gym', 'Parking', 'Security', 'Power Backup',
    'Lift', 'Garden', 'Clubhouse', 'Children Play Area', 'Jogging Track',
    'Indoor Games', 'Party Hall', 'CCTV', 'Intercom', 'Rainwater Harvesting'
  ];

  // Get all countries
  const countries = useMemo(() => Country.getAllCountries(), []);
  
  // Get states for selected country
  const states = useMemo(() => {
    if (!formData.location.country) return [];
    return State.getStatesOfCountry(formData.location.country);
  }, [formData.location.country]);

  // Get cities for selected state
  const cities = useMemo(() => {
    if (!formData.location.country || !formData.location.state) return [];
    return City.getCitiesOfState(formData.location.country, formData.location.state);
  }, [formData.location.country, formData.location.state]);

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

  const handleImageUpload = (e, type = 'gallery') => {
    const files = Array.from(e.target.files);
    
    if (type === 'cover') {
      setFormData(prev => ({ ...prev, coverImage: files[0] }));
    } else {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...files]
      }));
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addBhkConfiguration = () => {
    if (!newBhkConfig.type || !newBhkConfig.totalUnits) {
      toast.error('Please fill BHK type and total units');
      return;
    }

    setFormData(prev => ({
      ...prev,
      bhkConfigurations: [...prev.bhkConfigurations, { ...newBhkConfig }]
    }));

    // Reset form
    setNewBhkConfig({
      type: '1BHK',
      totalUnits: '',
      availableUnits: '',
      priceMin: '',
      priceMax: '',
      carpetAreaMin: '',
      carpetAreaMax: '',
    });
  };

  const removeBhkConfiguration = (index) => {
    setFormData(prev => ({
      ...prev,
      bhkConfigurations: prev.bhkConfigurations.filter((_, i) => i !== index)
    }));
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only submit if we're on the final step
    if (currentStep !== 4) {
      return;
    }
    
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Basic info
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('status', formData.status);
      
      // Location
      formDataToSend.append('location', JSON.stringify(formData.location));
      
      // Images
      if (formData.coverImage) {
        formDataToSend.append('coverImage', formData.coverImage);
      }
      formData.images.forEach((image, index) => {
        formDataToSend.append(`images`, image);
      });
      
      // BHK Configurations and Specifications
      const specifications = {
        totalUnits: formData.bhkConfigurations.reduce((sum, config) => sum + parseInt(config.totalUnits || 0), 0),
        availableUnits: formData.bhkConfigurations.reduce((sum, config) => sum + parseInt(config.availableUnits || 0), 0),
        bhkTypes: formData.bhkConfigurations.map(c => c.type),
        priceRange: {
          min: Math.min(...formData.bhkConfigurations.map(c => parseInt(c.priceMin || 0))),
          max: Math.max(...formData.bhkConfigurations.map(c => parseInt(c.priceMax || 0))),
        },
        carpetArea: {
          min: Math.min(...formData.bhkConfigurations.map(c => parseInt(c.carpetAreaMin || 0))),
          max: Math.max(...formData.bhkConfigurations.map(c => parseInt(c.carpetAreaMax || 0))),
        }
      };
      
      formDataToSend.append('specifications', JSON.stringify(specifications));
      formDataToSend.append('bhkConfigurations', JSON.stringify(formData.bhkConfigurations));
      formDataToSend.append('amenities', JSON.stringify(formData.amenities));

      const response = await api.post('/projects', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Project created successfully');
      onSuccess(response.data.project);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        status: 'planning',
        coverImage: null,
        images: [],
        location: { country: '', state: '', city: '', pincode: '', address: '' },
        bhkConfigurations: [],
        amenities: [],
      });
      setCurrentStep(1);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && (!formData.name || !formData.status)) {
      toast.error('Please fill required fields');
      return;
    }
    if (currentStep === 2 && (!formData.location.country || !formData.location.city)) {
      toast.error('Please fill location details');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleKeyDown = (e) => {
    // Prevent Enter key from submitting form unless on final step
    if (e.key === 'Enter' && currentStep !== 4) {
      e.preventDefault();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project" size="2xl">
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-500'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`flex-1 h-1 mx-2 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-1">Step 1: Basic Information</h3>
              <p className="text-sm text-blue-700">Enter the project name, description, and status</p>
            </div>

            <Input
              label="Project Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="e.g., Skyline Towers"
              className="text-lg"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your project..."
              />
            </div>

            <Select
              label="Project Status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              options={statusOptions}
              required
            />

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'cover')}
                  className="hidden"
                  id="cover-upload"
                />
                <label htmlFor="cover-upload" className="cursor-pointer">
                  {formData.coverImage ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <ImageIcon className="w-5 h-5" />
                      <span>{formData.coverImage.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Click to upload cover image</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Gallery Images Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Images (Gallery)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e, 'gallery')}
                  className="hidden"
                  id="gallery-upload"
                />
                <label htmlFor="gallery-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">Click to upload multiple images</span>
                  </div>
                </label>
              </div>
              
              {/* Image Preview */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-900 mb-1">Step 2: Location Details</h3>
              <p className="text-sm text-green-700">Specify the project location</p>
            </div>

            <Select
              label="Country"
              value={formData.location.country}
              onChange={(e) => {
                const selectedCountry = countries.find(c => c.isoCode === e.target.value);
                handleChange('location.country', e.target.value);
                handleChange('location.state', '');
                handleChange('location.city', '');
              }}
              options={[
                { value: '', label: 'Select Country' },
                ...countries.map(c => ({ value: c.isoCode, label: c.name }))
              ]}
              required
            />

            {formData.location.country && states.length > 0 && (
              <Select
                label="State / Province"
                value={formData.location.state}
                onChange={(e) => {
                  handleChange('location.state', e.target.value);
                  handleChange('location.city', '');
                }}
                options={[
                  { value: '', label: 'Select State' },
                  ...states.map(s => ({ value: s.isoCode, label: s.name }))
                ]}
                required
              />
            )}

            {formData.location.state && cities.length > 0 && (
              <Select
                label="City"
                value={formData.location.city}
                onChange={(e) => handleChange('location.city', e.target.value)}
                options={[
                  { value: '', label: 'Select City' },
                  ...cities.map(c => ({ value: c.name, label: c.name }))
                ]}
                required
              />
            )}

            <Input
              label="PIN Code / ZIP Code"
              value={formData.location.pincode}
              onChange={(e) => handleChange('location.pincode', e.target.value)}
              placeholder="Enter PIN/ZIP code"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descriptive Address
              </label>
              <textarea
                value={formData.location.address}
                onChange={(e) => handleChange('location.address', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter complete address with landmarks..."
              />
            </div>
          </div>
        )}

        {/* Step 3: BHK Configurations */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-1">Step 3: Unit Configurations</h3>
              <p className="text-sm text-purple-700">Add different BHK types and their details</p>
            </div>

            {/* Add BHK Configuration Form */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Add BHK Configuration</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="BHK Type"
                  value={newBhkConfig.type}
                  onChange={(e) => setNewBhkConfig(prev => ({ ...prev, type: e.target.value }))}
                  options={bhkTypeOptions.map(type => ({ value: type, label: type }))}
                />

                <Input
                  label="Total Units"
                  type="number"
                  value={newBhkConfig.totalUnits}
                  onChange={(e) => setNewBhkConfig(prev => ({ ...prev, totalUnits: e.target.value }))}
                  placeholder="Total units"
                />

                <Input
                  label="Available Units"
                  type="number"
                  value={newBhkConfig.availableUnits}
                  onChange={(e) => setNewBhkConfig(prev => ({ ...prev, availableUnits: e.target.value }))}
                  placeholder="Available units"
                />

                <Input
                  label="Min Price (₹)"
                  type="number"
                  value={newBhkConfig.priceMin}
                  onChange={(e) => setNewBhkConfig(prev => ({ ...prev, priceMin: e.target.value }))}
                  placeholder="Minimum price"
                />

                <Input
                  label="Max Price (₹)"
                  type="number"
                  value={newBhkConfig.priceMax}
                  onChange={(e) => setNewBhkConfig(prev => ({ ...prev, priceMax: e.target.value }))}
                  placeholder="Maximum price"
                />

                <Input
                  label="Min Carpet Area (sqft)"
                  type="number"
                  value={newBhkConfig.carpetAreaMin}
                  onChange={(e) => setNewBhkConfig(prev => ({ ...prev, carpetAreaMin: e.target.value }))}
                  placeholder="Min area"
                />

                <Input
                  label="Max Carpet Area (sqft)"
                  type="number"
                  value={newBhkConfig.carpetAreaMax}
                  onChange={(e) => setNewBhkConfig(prev => ({ ...prev, carpetAreaMax: e.target.value }))}
                  placeholder="Max area"
                />
              </div>

              <Button
                type="button"
                onClick={addBhkConfiguration}
                className="mt-4"
                icon={<Plus className="w-4 h-4" />}
              >
                Add Configuration
              </Button>
            </div>

            {/* Added Configurations List */}
            {formData.bhkConfigurations.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Added Configurations</h4>
                {formData.bhkConfigurations.map((config, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-blue-600">{config.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Units:</span> {config.totalUnits} ({config.availableUnits} available)
                      </div>
                      <div>
                        <span className="text-gray-600">Price:</span> ₹{config.priceMin} - ₹{config.priceMax}
                      </div>
                      <div>
                        <span className="text-gray-600">Area:</span> {config.carpetAreaMin} - {config.carpetAreaMax} sqft
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBhkConfiguration(index)}
                      className="ml-4 text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Amenities */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-orange-50 border-l-4 border-orange-600 p-4 mb-6">
              <h3 className="text-lg font-semibold text-orange-900 mb-1">Step 4: Amenities</h3>
              <p className="text-sm text-orange-700">Select amenities available in the project</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {commonAmenities.map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.amenities.includes(amenity)
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>

            {formData.amenities.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Selected Amenities ({formData.amenities.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity) => (
                    <span key={amenity} className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            {currentStep < 4 ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button type="submit" loading={loading}>
                Create Project
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CreateProject;
