import React, { useState } from 'react';
import { Save, X, AlertTriangle, DollarSign, FileText } from 'lucide-react';

interface EstimateRevisionFormProps {
  estimateId: number;
  currentEstimate: any;
  onSave: (revisionData: any) => void;
  onCancel: () => void;
}

const EstimateRevisionForm: React.FC<EstimateRevisionFormProps> = ({
  estimateId,
  currentEstimate,
  onSave,
  onCancel
}) => {
  console.log('EstimateRevisionForm - currentEstimate:', currentEstimate);
  console.log('EstimateRevisionForm - project_areas:', currentEstimate.project_areas);
  console.log('EstimateRevisionForm - project_areas length:', currentEstimate.project_areas?.length);
  const [formData, setFormData] = useState({
    revision_type: 'price_adjustment',
    change_summary: '',
    change_reason: '',
    markup_percentage: currentEstimate.markup_percentage || 15,
    terms_and_notes: currentEstimate.terms_and_notes || '',
    project_areas: currentEstimate.project_areas ? [...currentEstimate.project_areas] : []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const revisionTypes = [
    { value: 'price_adjustment', label: 'Price Adjustment', description: 'Modify pricing, markup, or labor costs' },
    { value: 'scope_change', label: 'Scope Change', description: 'Add, remove, or modify work areas' },
    { value: 'client_request', label: 'Client Request', description: 'Changes requested by the client' },
    { value: 'correction', label: 'Correction', description: 'Fix errors or clarify details' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.change_summary.trim()) {
      newErrors.change_summary = 'Please provide a summary of changes';
    }
    if (formData.markup_percentage < 0 || formData.markup_percentage > 100) {
      newErrors.markup_percentage = 'Markup percentage must be between 0 and 100';
    }

    // Validate project areas if they have been modified
    formData.project_areas.forEach((area, index) => {
      if (area.labor_rate && (area.labor_rate < 0 || area.labor_rate > 1000)) {
        newErrors[`area_${index}_labor_rate`] = 'Labor rate must be between $0 and $1000';
      }
      if (area.material_cost && area.material_cost < 0) {
        newErrors[`area_${index}_material_cost`] = 'Material cost cannot be negative';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate new totals based on project area changes and markup
      const newLaborCost = formData.project_areas.reduce((sum, area) => {
        return sum + (area.labor_hours * area.labor_rate || 0);
      }, 0);
      
      const newMaterialCost = formData.project_areas.reduce((sum, area) => {
        return sum + (area.material_cost || 0);
      }, 0);
      
      const baseCost = newLaborCost + newMaterialCost;
      const newMarkupAmount = baseCost * (formData.markup_percentage / 100);
      const newTotalAmount = baseCost + newMarkupAmount;

      const revisionData = {
        revision_type: formData.revision_type,
        change_summary: formData.change_summary,
        created_by: 'user',
        changes: {
          markup_percentage: formData.markup_percentage,
          labor_cost: newLaborCost,
          material_cost: newMaterialCost,
          total_amount: newTotalAmount,
          terms_and_notes: formData.terms_and_notes,
          change_reason: formData.change_reason,
          project_areas: formData.project_areas
        }
      };

      console.log('Creating revision with data:', revisionData);

      await onSave(revisionData);
    } catch (error) {
      setErrors({ submit: 'Failed to create revision. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate preview of changes
  const currentBaseCost = currentEstimate.labor_cost + currentEstimate.material_cost;
  const currentMarkupAmount = currentBaseCost * (currentEstimate.markup_percentage / 100);
  const currentTotal = currentBaseCost + currentMarkupAmount;
  
  // Calculate new costs based on project area changes
  const newLaborCost = formData.project_areas.reduce((sum, area) => {
    return sum + (area.labor_hours * area.labor_rate || 0);
  }, 0);
  
  const newMaterialCost = formData.project_areas.reduce((sum, area) => {
    return sum + (area.material_cost || 0);
  }, 0);
  
  const newBaseCost = newLaborCost + newMaterialCost;
  const newMarkupAmount = newBaseCost * (formData.markup_percentage / 100);
  const newTotal = newBaseCost + newMarkupAmount;
  
  const totalChange = newTotal - currentTotal;
  const percentageChange = currentTotal > 0 ? ((totalChange / currentTotal) * 100) : 0;

  // Helper function to update project area field
  const updateProjectArea = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      project_areas: prev.project_areas.map((area, i) => 
        i === index ? { ...area, [field]: value } : area
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <div>
                <h2 className="text-xl font-bold">Create Estimate Revision</h2>
                <p className="text-purple-100">Modify estimate details while maintaining version history</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:text-purple-200 p-2 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle size={20} />
                <span className="font-medium">Error creating revision</span>
              </div>
              <p className="text-red-600 mt-1">{errors.submit}</p>
            </div>
          )}

          {/* Revision Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Revision Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {revisionTypes.map((type) => (
                <label
                  key={type.value}
                  className={`relative p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.revision_type === type.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="revision_type"
                    value={type.value}
                    checked={formData.revision_type === type.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, revision_type: e.target.value }))}
                    className="sr-only"
                  />
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-500">{type.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Change Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Change Summary *
            </label>
            <input
              type="text"
              value={formData.change_summary}
              onChange={(e) => setFormData(prev => ({ ...prev, change_summary: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.change_summary ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Brief description of what's changing..."
            />
            {errors.change_summary && <p className="text-red-500 text-sm mt-1">{errors.change_summary}</p>}
          </div>

          {/* Markup Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Markup Percentage (%) *
            </label>
            <input
              type="number"
              value={formData.markup_percentage}
              onChange={(e) => setFormData(prev => ({ ...prev, markup_percentage: parseFloat(e.target.value) || 0 }))}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.markup_percentage ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0"
              max="100"
              step="0.1"
            />
            {errors.markup_percentage && <p className="text-red-500 text-sm mt-1">{errors.markup_percentage}</p>}
          </div>

          {/* Project Areas - Detailed Cost Editing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Project Area Cost Adjustments
            </label>
            {true ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {formData.project_areas.map((area, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{area.area_name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Labor Hours
                        </label>
                        <input
                          type="number"
                          value={area.labor_hours || 0}
                          onChange={(e) => updateProjectArea(index, 'labor_hours', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Labor Rate ($/hr)
                        </label>
                        <input
                          type="number"
                          value={area.labor_rate || 0}
                          onChange={(e) => updateProjectArea(index, 'labor_rate', parseFloat(e.target.value) || 0)}
                          className={`w-full border rounded px-3 py-2 text-sm ${
                            errors[`area_${index}_labor_rate`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          min="0"
                          max="1000"
                          step="0.01"
                        />
                        {errors[`area_${index}_labor_rate`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`area_${index}_labor_rate`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Material Cost ($)
                        </label>
                        <input
                          type="number"
                          value={area.material_cost || 0}
                          onChange={(e) => updateProjectArea(index, 'material_cost', parseFloat(e.target.value) || 0)}
                          className={`w-full border rounded px-3 py-2 text-sm ${
                            errors[`area_${index}_material_cost`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          min="0"
                          step="0.01"
                        />
                        {errors[`area_${index}_material_cost`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`area_${index}_material_cost`]}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        Labor Subtotal: {formatCurrency((area.labor_hours || 0) * (area.labor_rate || 0))}
                      </div>
                      <div>
                        Area Total: {formatCurrency(((area.labor_hours || 0) * (area.labor_rate || 0)) + (area.material_cost || 0))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-700">No project areas found for this estimate.</p>
                <p className="text-sm text-yellow-600 mt-1">You can only adjust the markup percentage for this revision.</p>
              </div>
            )}
          </div>

          {/* Price Change Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign size={18} />
              Price Change Preview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Current Estimate</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Labor Cost:</span>
                    <span>{formatCurrency(currentEstimate.labor_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material Cost:</span>
                    <span>{formatCurrency(currentEstimate.material_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Markup ({currentEstimate.markup_percentage}%):</span>
                    <span>{formatCurrency(currentMarkupAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(currentTotal)}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Revised Estimate</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Labor Cost:</span>
                    <span className={newLaborCost !== currentEstimate.labor_cost ? 'font-semibold text-blue-600' : ''}>
                      {formatCurrency(newLaborCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material Cost:</span>
                    <span className={newMaterialCost !== currentEstimate.material_cost ? 'font-semibold text-blue-600' : ''}>
                      {formatCurrency(newMaterialCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Markup ({formData.markup_percentage}%):</span>
                    <span className={formData.markup_percentage !== currentEstimate.markup_percentage ? 'font-semibold text-blue-600' : ''}>
                      {formatCurrency(newMarkupAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total:</span>
                    <span className={`${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(newTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span>Change:</span>
                    <span className={`font-semibold ${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)} ({totalChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Reason for Change
            </label>
            <textarea
              value={formData.change_reason}
              onChange={(e) => setFormData(prev => ({ ...prev, change_reason: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Provide additional context for this revision..."
            />
          </div>

          {/* Updated Terms and Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Updated Terms and Notes
            </label>
            <textarea
              value={formData.terms_and_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_and_notes: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Update any terms, conditions, or notes for this revision..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting ? 'Creating Revision...' : 'Create Revision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EstimateRevisionForm;