import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, AlertCircle, Edit3 } from 'lucide-react';
import { Invoice } from '../services/api';
import apiService from '../services/api';

interface InvoiceEditProps {
  invoice: Invoice;
  onSave: (updatedInvoice: Invoice) => void;
  onCancel: () => void;
}

interface EditableInvoiceData {
  title: string;
  description: string;
  total_amount: number;
  due_date: string;
  payment_terms: string;
  terms_and_notes: string;
}

const InvoiceEdit: React.FC<InvoiceEditProps> = ({ invoice, onSave, onCancel }) => {
  const [formData, setFormData] = useState<EditableInvoiceData>({
    title: invoice.title,
    description: invoice.description || '',
    total_amount: invoice.total_amount,
    due_date: invoice.due_date || '',
    payment_terms: invoice.payment_terms,
    terms_and_notes: invoice.terms_and_notes || ''
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
    if (formData.total_amount <= 0) newErrors.total_amount = 'Total amount must be greater than 0';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Call API to update invoice
      const response = await fetch(`http://localhost:5001/api/invoices/${invoice.id}`, {
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

  const originalAmount = invoice.total_amount;
  const difference = formData.total_amount - originalAmount;
  const discountApplied = difference < 0;
  const increaseApplied = difference > 0;

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
          </div>
        </div>

        {/* Pricing Adjustment */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Adjustment</h3>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Original Amount
                  </label>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(originalAmount)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Total Amount *
                  </label>
                  <input
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.total_amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    min="0"
                    step="0.01"
                  />
                  {errors.total_amount && <p className="text-red-500 text-sm mt-1">{errors.total_amount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Adjustment
                  </label>
                  <div className={`text-lg font-semibold ${
                    difference === 0 ? 'text-gray-900' :
                    discountApplied ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {difference === 0 ? 'No change' :
                     discountApplied ? `${formatCurrency(Math.abs(difference))} discount` :
                     `${formatCurrency(difference)} increase`}
                  </div>
                </div>
              </div>
            </div>

            {(discountApplied || increaseApplied) && (
              <div className={`p-4 rounded-lg border ${
                discountApplied ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className={`text-sm ${discountApplied ? 'text-green-800' : 'text-blue-800'}`}>
                  {discountApplied ? 
                    `💡 Discount of ${formatCurrency(Math.abs(difference))} will be applied to this invoice.` :
                    `⚡ Additional charges of ${formatCurrency(difference)} will be added to this invoice.`
                  }
                </div>
              </div>
            )}
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