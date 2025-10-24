import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, AlertCircle, Edit3, Plus, Trash2 } from 'lucide-react';
import { Invoice, ProjectArea } from '../services/api';
import apiService from '../services/api';

interface InvoiceEditProps {
  invoice: Invoice;
  onSave: (updatedInvoice: Invoice) => void;
  onCancel: () => void;
}

interface EditableInvoiceData {
  title: string;
  description: string;
  due_date: string;
  payment_terms: string;
  terms_and_notes: string;
  created_at: string;
  project_areas: ProjectArea[];
}

const InvoiceEdit: React.FC<InvoiceEditProps> = ({ invoice, onSave, onCancel }) => {
  const [formData, setFormData] = useState<EditableInvoiceData>({
    title: invoice.title,
    description: invoice.description || '',
    due_date: invoice.due_date || '',
    payment_terms: invoice.payment_terms,
    terms_and_notes: invoice.terms_and_notes || '',
    created_at: invoice.created_at ? invoice.created_at.split('T')[0] : '',
    project_areas: invoice.project_areas || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateTotals = () => {
    let totalLabor = 0;
    let totalMaterial = 0;

    formData.project_areas.forEach(area => {
      totalLabor += area.labor_cost || 0;
      totalMaterial += area.material_cost || 0;
    });

    const total = totalLabor + totalMaterial;

    return { totalLabor, totalMaterial, total };
  };

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
        labor_cost: 0,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';

    formData.project_areas.forEach((area, index) => {
      if (!area.area_name.trim()) newErrors[`area_${index}_name`] = 'Area name is required';
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Call API to update invoice
      const response = await fetch(`/api/invoices/${invoice.id}`, {
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
        setErrors({ submit: result.error || 'Failed to update invoice' });
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      setErrors({ submit: 'Failed to update invoice. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { totalLabor, totalMaterial, total } = calculateTotals();

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
              Edit Invoice - {invoice.invoice_number}
            </h2>
            <p className="text-gray-600">Make adjustments to pricing, terms, and other invoice details</p>
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
              <span className="font-medium">Error updating invoice</span>
            </div>
            <p className="text-red-600 mt-1">{errors.submit}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h3>
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
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Net 30">Net 30</option>
                <option value="Net 15">Net 15</option>
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 60">Net 60</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Date
              </label>
              <input
                type="date"
                value={formData.created_at}
                onChange={(e) => setFormData(prev => ({ ...prev, created_at: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Project Areas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Project Areas</h3>
            <button
              type="button"
              onClick={addProjectArea}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add Area
            </button>
          </div>

          <div className="space-y-6">
            {formData.project_areas.map((area, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Area {index + 1}</h4>
                  {formData.project_areas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProjectArea(index)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Row 1: Area Name, Area Type, Surface Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area Name *
                    </label>
                    <input
                      type="text"
                      value={area.area_name}
                      onChange={(e) => updateProjectArea(index, 'area_name', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`area_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Living Room"
                    />
                    {errors[`area_${index}_name`] && <p className="text-red-500 text-sm mt-1">{errors[`area_${index}_name`]}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area Type
                    </label>
                    <select
                      value={area.area_type}
                      onChange={(e) => updateProjectArea(index, 'area_type', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="drywall">Drywall</option>
                      <option value="wood">Wood</option>
                      <option value="metal">Metal</option>
                      <option value="brick">Brick</option>
                      <option value="stucco">Stucco</option>
                      <option value="concrete">Concrete</option>
                    </select>
                  </div>

                  {/* Row 2: Square Footage, Ceiling Height, Prep Requirements */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size (sq ft)
                    </label>
                    <input
                      type="number"
                      value={area.square_footage || 0}
                      onChange={(e) => updateProjectArea(index, 'square_footage', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ceiling Height (ft)
                    </label>
                    <input
                      type="number"
                      value={area.ceiling_height || 8}
                      onChange={(e) => updateProjectArea(index, 'ceiling_height', parseFloat(e.target.value) || 8)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prep Requirements
                    </label>
                    <input
                      type="text"
                      value={area.prep_requirements || ''}
                      onChange={(e) => updateProjectArea(index, 'prep_requirements', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Sanding, priming"
                    />
                  </div>

                  {/* Row 3: Paint Type, Paint Brand, Paint Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paint Type
                    </label>
                    <select
                      value={area.paint_type}
                      onChange={(e) => updateProjectArea(index, 'paint_type', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Latex">Latex</option>
                      <option value="Oil-Based">Oil-Based</option>
                      <option value="Acrylic">Acrylic</option>
                      <option value="Enamel">Enamel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={area.paint_brand}
                      onChange={(e) => updateProjectArea(index, 'paint_brand', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Benjamin Moore"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <input
                      type="text"
                      value={area.paint_color || ''}
                      onChange={(e) => updateProjectArea(index, 'paint_color', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Cloud White"
                    />
                  </div>

                  {/* Row 4: Finish Type, Number of Coats */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Finish Type
                    </label>
                    <select
                      value={area.finish_type}
                      onChange={(e) => updateProjectArea(index, 'finish_type', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Flat">Flat</option>
                      <option value="Eggshell">Eggshell</option>
                      <option value="Satin">Satin</option>
                      <option value="Semi-Gloss">Semi-Gloss</option>
                      <option value="Gloss">Gloss</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Coats
                    </label>
                    <input
                      type="number"
                      value={area.number_of_coats || 2}
                      onChange={(e) => updateProjectArea(index, 'number_of_coats', parseInt(e.target.value) || 2)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max="10"
                    />
                  </div>

                  {/* Row 5: Labor Cost, Material Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Labor Cost ($)
                    </label>
                    <input
                      type="number"
                      value={area.labor_cost || 0}
                      onChange={(e) => updateProjectArea(index, 'labor_cost', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material Cost ($)
                    </label>
                    <input
                      type="number"
                      value={area.material_cost || 0}
                      onChange={(e) => updateProjectArea(index, 'material_cost', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Row 6: Notes (full width) */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={area.notes || ''}
                      onChange={(e) => updateProjectArea(index, 'notes', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional notes for this area..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Labor Cost</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(totalLabor)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Material Cost</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(totalMaterial)}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="text-sm text-blue-600 font-medium">Total Amount</div>
              <div className="text-2xl font-bold text-blue-900">{formatCurrency(total)}</div>
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
              placeholder="Enter any specific terms, conditions, warranty information, payment terms, discount explanations, or special notes for this invoice..."
            />
            <p className="text-sm text-gray-500 mt-2">
              Use this section to explain pricing adjustments, provide warranty information, or add any other relevant details.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InvoiceEdit;