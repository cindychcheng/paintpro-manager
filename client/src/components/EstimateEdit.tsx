import React, { useState } from 'react';
import { Save, ArrowLeft, AlertCircle, Edit3 } from 'lucide-react';
import { Estimate } from '../services/api';

interface EstimateEditProps {
  estimate: Estimate;
  onSave: (updatedEstimate: Estimate) => void;
  onCancel: () => void;
}

interface EditableEstimateData {
  title: string;
  description: string;
  valid_until: string;
  markup_percentage: number;
  terms_and_notes: string;
}

const EstimateEdit: React.FC<EstimateEditProps> = ({ estimate, onSave, onCancel }) => {
  const [formData, setFormData] = useState<EditableEstimateData>({
    title: estimate.title,
    description: estimate.description || '',
    valid_until: estimate.valid_until || '',
    markup_percentage: estimate.markup_percentage,
    terms_and_notes: estimate.terms_and_notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (formData.markup_percentage < 0 || formData.markup_percentage > 100) {
      newErrors.markup_percentage = 'Markup percentage must be between 0 and 100';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Call API to update estimate
      const response = await fetch(`http://localhost:5001/api/estimates/${estimate.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        onSave(result.data);
      } else {
        setErrors({ submit: result.error || 'Failed to update estimate' });
      }
    } catch (error) {
      console.error('Error updating estimate:', error);
      setErrors({ submit: 'Failed to update estimate. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const originalMarkup = estimate.markup_percentage;
  const markupDifference = formData.markup_percentage - originalMarkup;
  const markupIncreased = markupDifference > 0;
  const markupDecreased = markupDifference < 0;

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
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Edit3 className="text-blue-600" size={24} />
              Edit Estimate - {estimate.estimate_number}
            </h2>
            <p className="text-gray-600">Make adjustments to estimate details and terms</p>
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={20} />
              <span className="font-medium">Error updating estimate</span>
            </div>
            <p className="text-red-600 mt-1">{errors.submit}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estimate Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Interior Painting - Living Room & Kitchen"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detailed description of the project..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valid Until
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markup Percentage (%) *
              </label>
              <input
                type="number"
                value={formData.markup_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, markup_percentage: parseFloat(e.target.value) || 0 }))}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.markup_percentage ? 'border-red-300' : 'border-gray-300'
                }`}
                min="0"
                max="100"
                step="0.1"
              />
              {errors.markup_percentage && <p className="text-red-500 text-sm mt-1">{errors.markup_percentage}</p>}
            </div>
          </div>
        </div>

        {/* Markup Adjustment */}
        {markupDifference !== 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Markup Adjustment</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Original Markup
                    </label>
                    <div className="text-lg font-semibold text-gray-900">
                      {originalMarkup}%
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      New Markup
                    </label>
                    <div className="text-lg font-semibold text-gray-900">
                      {formData.markup_percentage}%
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Change
                    </label>
                    <div className={`text-lg font-semibold ${
                      markupIncreased ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {markupIncreased ? '+' : ''}{markupDifference.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                markupIncreased ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
              }`}>
                <div className={`text-sm ${markupIncreased ? 'text-blue-800' : 'text-green-800'}`}>
                  {markupIncreased ? 
                    `⚡ Markup increased by ${markupDifference.toFixed(1)}% - this will increase the total estimate amount.` :
                    `💡 Markup reduced by ${Math.abs(markupDifference).toFixed(1)}% - this will decrease the total estimate amount.`
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cost Summary Display */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Cost Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Labor Cost</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(estimate.labor_cost)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Material Cost</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(estimate.material_cost)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Markup ({formData.markup_percentage}%)</div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency((estimate.labor_cost + estimate.material_cost) * (formData.markup_percentage / 100))}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="text-sm text-blue-600 font-medium">New Total</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(estimate.labor_cost + estimate.material_cost + ((estimate.labor_cost + estimate.material_cost) * (formData.markup_percentage / 100)))}
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms and Notes</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Terms, Conditions, and Notes
            </label>
            <textarea
              value={formData.terms_and_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_and_notes: e.target.value }))}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter any specific terms, conditions, warranty information, payment terms, or special notes for this estimate..."
            />
            <p className="text-sm text-gray-500 mt-2">
              Use this section to provide warranty information, explain pricing changes, or add any other relevant details.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EstimateEdit;