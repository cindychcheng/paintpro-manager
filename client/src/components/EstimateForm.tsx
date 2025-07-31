import React, { useState } from 'react';
import { Save, Plus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useEstimates } from '../hooks/useEstimates';
import { CreateEstimateRequest } from '../services/api';

interface ProjectArea {
  id?: number;
  area_name: string;
  area_type: 'indoor' | 'outdoor';
  surface_type: string;
  square_footage?: number;
  ceiling_height?: number;
  prep_requirements: string;
  paint_type: string;
  paint_brand: string;
  paint_color: string;
  finish_type: string;
  number_of_coats: number;
  labor_hours: number;
  labor_rate: number;
  labor_cost?: number;
  labor_cost_method: 'hours_rate' | 'direct_cost';
  material_cost: number;
  notes?: string;
}

interface EstimateFormProps {
  onSave: () => void; // Called on successful save
  onCancel: () => void;
  initialData?: Partial<CreateEstimateRequest>;
}

const EstimateForm: React.FC<EstimateFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<CreateEstimateRequest>({
    client_id: initialData?.client_id || 0,
    title: initialData?.title || '',
    description: initialData?.description || '',
    valid_until: initialData?.valid_until || '',
    markup_percentage: initialData?.markup_percentage || 15,
    terms_and_notes: initialData?.terms_and_notes || '',
    project_areas: initialData?.project_areas || [{
      area_name: '',
      area_type: 'indoor',
      surface_type: 'drywall',
      square_footage: undefined,
      ceiling_height: 8,
      prep_requirements: '',
      paint_type: 'Latex',
      paint_brand: 'Benjamin Moore',
      paint_color: '',
      finish_type: 'Eggshell',
      number_of_coats: 2,
      labor_hours: 0,
      labor_rate: 45,
      labor_cost: 0,
      labor_cost_method: 'hours_rate' as const,
      material_cost: 0,
      notes: ''
    }]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get real clients from API
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  
  // Get estimates hook for creating new estimates
  const { createEstimate } = useEstimates();

  const addProjectArea = () => {
    setFormData(prev => ({
      ...prev,
      project_areas: [...prev.project_areas, {
        area_name: '',
        area_type: 'indoor',
        surface_type: 'drywall',
        square_footage: 0,
        ceiling_height: 8,
        prep_requirements: '',
        paint_type: 'Latex',
        paint_brand: 'Benjamin Moore',
        paint_color: '',
        finish_type: 'Eggshell',
        number_of_coats: 2,
        labor_hours: 0,
        labor_rate: 45,
        labor_cost: 0,
        labor_cost_method: 'hours_rate' as const,
        material_cost: 0,
        notes: ''
      }]
    }));
  };

  const removeProjectArea = (index: number) => {
    if (formData.project_areas.length > 1) {
      setFormData(prev => ({
        ...prev,
        project_areas: prev.project_areas.filter((_, i) => i !== index)
      }));
    }
  };

  const updateProjectArea = (index: number, field: keyof ProjectArea, value: any) => {
    setFormData(prev => ({
      ...prev,
      project_areas: prev.project_areas.map((area, i) => 
        i === index ? { ...area, [field]: value } : area
      )
    }));
  };

  const calculateTotals = () => {
    let totalLabor = 0;
    let totalMaterial = 0;

    formData.project_areas.forEach(area => {
      if (area.labor_cost_method === 'direct_cost') {
        totalLabor += area.labor_cost || 0;
      } else {
        totalLabor += area.labor_hours * area.labor_rate;
      }
      totalMaterial += area.material_cost;
    });

    const markup = (totalLabor + totalMaterial) * ((formData.markup_percentage || 0) / 100);
    const total = totalLabor + totalMaterial + markup;

    return { totalLabor, totalMaterial, markup, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.client_id) newErrors.client_id = 'Please select a client';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (formData.project_areas.length === 0) newErrors.areas = 'At least one project area is required';
    
    formData.project_areas.forEach((area, index) => {
      if (!area.area_name.trim()) newErrors[`area_${index}_name`] = 'Area name is required';
      // Square footage is now optional
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await createEstimate(formData);
      if (success) {
        onSave(); // Navigate back to estimates list
      }
    } catch (error) {
      setErrors({ submit: 'Failed to save estimate. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { totalLabor, totalMaterial, markup, total } = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Header - Mobile Optimized */}
      <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900 p-2 -ml-2 sm:ml-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create New Estimate</h2>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Fill out the details for your painting project estimate</p>
          </div>
        </div>
        
        {/* Mobile: Full-width buttons, Desktop: Inline */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || clientsLoading}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 sm:py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {isSubmitting ? 'Saving...' : 'Save Estimate'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Error Display */}
        {clientsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={20} />
              <span className="font-medium">Error loading clients</span>
            </div>
            <p className="text-red-600 mt-1">{clientsError}</p>
          </div>
        )}

        {/* Basic Information - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Basic Information</h3>
          <div className="space-y-4 sm:space-y-6">
            {/* Single column on mobile, two columns on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_id: parseInt(e.target.value) }))}
                  disabled={clientsLoading}
                  className={`w-full border rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${
                    errors.client_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value={0}>Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                {errors.client_id && <p className="text-red-500 text-sm mt-1">{errors.client_id}</p>}
              </div>
              
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full border rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Interior Painting - Living Room & Kitchen"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detailed description of the project..."
              />
            </div>
            
            <div className="sm:max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markup Percentage (%)
              </label>
              <input
                type="number"
                value={formData.markup_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, markup_percentage: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="100"
                step="0.1"
                inputMode="decimal"
              />
            </div>
          </div>
        </div>

        {/* Project Areas - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Project Areas</h3>
            <button
              type="button"
              onClick={addProjectArea}
              className="w-full sm:w-auto bg-blue-500 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Area
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {formData.project_areas.map((area, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Area {index + 1}</h4>
                  {formData.project_areas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProjectArea(index)}
                      className="text-red-600 hover:text-red-800 p-2 -mr-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Mobile: Single column, Tablet+: Multiple columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area Name *
                    </label>
                    <input
                      type="text"
                      value={area.area_name}
                      onChange={(e) => updateProjectArea(index, 'area_name', e.target.value)}
                      className={`w-full border rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`area_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Living Room"
                    />
                    {errors[`area_${index}_name`] && <p className="text-red-500 text-sm mt-1">{errors[`area_${index}_name`]}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={area.area_type}
                      onChange={(e) => updateProjectArea(index, 'area_type', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="indoor">Indoor</option>
                      <option value="outdoor">Outdoor</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Surface Type
                    </label>
                    <select
                      value={area.surface_type}
                      onChange={(e) => updateProjectArea(index, 'surface_type', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="drywall">Drywall</option>
                      <option value="wood">Wood</option>
                      <option value="brick">Brick</option>
                      <option value="stucco">Stucco</option>
                      <option value="metal">Metal</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Square Footage
                    </label>
                    <input
                      type="number"
                      value={area.square_footage || ''}
                      onChange={(e) => updateProjectArea(index, 'square_footage', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className={`w-full border rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`area_${index}_sqft`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="0"
                    />
                    {errors[`area_${index}_sqft`] && <p className="text-red-500 text-sm mt-1">{errors[`area_${index}_sqft`]}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paint Brand
                    </label>
                    <input
                      type="text"
                      value={area.paint_brand}
                      onChange={(e) => updateProjectArea(index, 'paint_brand', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paint Color
                    </label>
                    <input
                      type="text"
                      value={area.paint_color}
                      onChange={(e) => updateProjectArea(index, 'paint_color', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Labor Cost Method Toggle */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Labor Cost Method
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`labor_method_${index}`}
                          value="hours_rate"
                          checked={area.labor_cost_method === 'hours_rate'}
                          onChange={(e) => updateProjectArea(index, 'labor_cost_method', e.target.value as 'hours_rate' | 'direct_cost')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Hours × Rate</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`labor_method_${index}`}
                          value="direct_cost"
                          checked={area.labor_cost_method === 'direct_cost'}
                          onChange={(e) => updateProjectArea(index, 'labor_cost_method', e.target.value as 'hours_rate' | 'direct_cost')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Direct Cost</span>
                      </label>
                    </div>
                  </div>

                  {/* Conditional Labor Cost Fields */}
                  {area.labor_cost_method === 'hours_rate' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Labor Hours
                        </label>
                        <input
                          type="number"
                          value={area.labor_hours}
                          onChange={(e) => updateProjectArea(index, 'labor_hours', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Labor Rate ($/hour)
                        </label>
                        <input
                          type="number"
                          value={area.labor_rate}
                          onChange={(e) => updateProjectArea(index, 'labor_rate', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Labor Total: ${((area.labor_hours || 0) * (area.labor_rate || 0)).toFixed(2)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Direct Labor Cost ($)
                      </label>
                      <input
                        type="number"
                        value={area.labor_cost || 0}
                        onChange={(e) => updateProjectArea(index, 'labor_cost', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="0.01"
                        placeholder="Enter total labor cost"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Cost ($)
                    </label>
                    <input
                      type="number"
                      value={area.material_cost}
                      onChange={(e) => updateProjectArea(index, 'material_cost', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}
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
              This information will be included in the estimate and can be transferred to the invoice for editing if needed.
            </p>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Labor Cost</div>
              <div className="text-xl font-bold text-gray-900">${totalLabor.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Material Cost</div>
              <div className="text-xl font-bold text-gray-900">${totalMaterial.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Markup ({formData.markup_percentage}%)</div>
              <div className="text-xl font-bold text-gray-900">${markup.toFixed(2)}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="text-sm text-blue-600 font-medium">Total Amount</div>
              <div className="text-2xl font-bold text-blue-900">${total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EstimateForm;