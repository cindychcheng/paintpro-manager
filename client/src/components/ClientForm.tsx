import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, AlertCircle, MapPin, User, Phone, Mail, FileText } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { Client } from '../services/api';

interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  job_address?: string;
  job_city?: string;
  job_state?: string;
  job_zip_code?: string;
  notes?: string;
}

interface ClientFormProps {
  onSave: () => void;
  onCancel: () => void;
  clientId?: number | null; // For editing existing clients
}

const ClientForm: React.FC<ClientFormProps> = ({ onSave, onCancel, clientId }) => {
  const [formData, setFormData] = useState<CreateClientRequest>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    job_address: '',
    job_city: '',
    job_state: '',
    job_zip_code: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sameAsJobAddress, setSameAsJobAddress] = useState(false);

  const { createClient, updateClient, getClient } = useClients();

  // Load client data if editing
  useEffect(() => {
    if (clientId) {
      const loadClient = async () => {
        try {
          const client = await getClient(clientId);
          if (client) {
            setFormData({
              name: client.name || '',
              email: client.email || '',
              phone: client.phone || '',
              address: client.address || '',
              city: client.city || '',
              state: client.state || '',
              zip_code: client.zip_code || '',
              job_address: client.job_address || '',
              job_city: client.job_city || '',
              job_state: client.job_state || '',
              job_zip_code: client.job_zip_code || '',
              notes: client.notes || ''
            });
          }
        } catch (error) {
          console.error('Failed to load client:', error);
        }
      };
      loadClient();
    }
  }, [clientId, getClient]);

  const updateField = (field: keyof CreateClientRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const copyBillingToJob = () => {
    if (sameAsJobAddress) {
      // Clear job address fields
      setFormData(prev => ({
        ...prev,
        job_address: '',
        job_city: '',
        job_state: '',
        job_zip_code: ''
      }));
    } else {
      // Copy billing address to job address
      setFormData(prev => ({
        ...prev,
        job_address: prev.address || '',
        job_city: prev.city || '',
        job_state: prev.state || '',
        job_zip_code: prev.zip_code || ''
      }));
    }
    setSameAsJobAddress(!sameAsJobAddress);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^\(?[\d\s\-\(\)\+\.]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = clientId 
        ? await updateClient(clientId, formData)
        : await createClient(formData);
      
      if (success) {
        onSave();
      } else {
        setErrors({ submit: 'Failed to save client. Please try again.' });
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred while saving the client.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditMode = !!clientId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900 p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Client' : 'Create New Client'}
            </h2>
            <p className="text-gray-600">
              {isEditMode ? 'Update client information and contact details' : 'Add a new client to your database'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Client' : 'Save Client')}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={20} />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 mt-1">{errors.submit}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter client name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline w-4 h-4 mr-1" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="client@example.com"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline w-4 h-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="(555) 123-4567"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="text-green-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Billing Address</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => updateField('zip_code', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="12345"
              />
            </div>
          </div>
        </div>

        {/* Job Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="text-purple-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Job Address</h3>
            </div>
            <button
              type="button"
              onClick={copyBillingToJob}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {sameAsJobAddress ? 'Use Different Address' : 'Same as Billing Address'}
            </button>
          </div>
          {!sameAsJobAddress && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Site Address
                </label>
                <input
                  type="text"
                  value={formData.job_address}
                  onChange={(e) => updateField('job_address', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 Job Site Street"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.job_city}
                  onChange={(e) => updateField('job_city', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData.job_state}
                  onChange={(e) => updateField('job_state', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.job_zip_code}
                  onChange={(e) => updateField('job_zip_code', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="12345"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-orange-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes and Special Instructions
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter any special notes, preferences, or important information about this client..."
            />
            <p className="text-sm text-gray-500 mt-2">
              Include any special requirements, preferred communication methods, or other relevant details.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;