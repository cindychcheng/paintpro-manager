import React, { useState } from 'react';
import { Save, X, DollarSign } from 'lucide-react';
import { Invoice, RecordPaymentRequest } from '../services/api';

interface PaymentFormProps {
  invoice: Invoice;
  onSave: (paymentData: RecordPaymentRequest) => Promise<boolean>;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ invoice, onSave, onCancel }) => {
  // Utility function to handle currency precision
  const roundCurrency = (amount: number): number => {
    return Math.round(amount * 100) / 100;
  };

  const outstandingAmount = roundCurrency(invoice.total_amount - invoice.paid_amount);

  const [formData, setFormData] = useState<RecordPaymentRequest>({
    amount: outstandingAmount, // Default to rounded outstanding amount
    payment_method: 'Check',
    payment_date: new Date().toISOString().split('T')[0], // Today's date
    reference_number: '',
    notes: ''
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
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Payment amount must be greater than 0';
    } else if (formData.amount > outstandingAmount) {
      newErrors.amount = `Payment amount cannot exceed outstanding balance of ${formatCurrency(outstandingAmount)}`;
    }
    
    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(formData);
      if (success) {
        // Form will be closed by parent component
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <DollarSign className="text-blue-600" size={24} />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                <p className="text-sm text-gray-600">Invoice: {invoice.invoice_number}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Invoice Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Client:</span>
                <div className="font-medium">{invoice.client_name}</div>
              </div>
              <div>
                <span className="text-gray-500">Total Amount:</span>
                <div className="font-medium">{formatCurrency(invoice.total_amount)}</div>
              </div>
              <div>
                <span className="text-gray-500">Paid Amount:</span>
                <div className="font-medium text-green-600">{formatCurrency(invoice.paid_amount)}</div>
              </div>
              <div>
                <span className="text-gray-500">Outstanding:</span>
                <div className="font-medium text-red-600">{formatCurrency(outstandingAmount)}</div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {formatCurrency(outstandingAmount)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="PayPal">PayPal</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.payment_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.payment_date && <p className="text-red-500 text-sm mt-1">{errors.payment_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Check number, transaction ID, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about this payment..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.amount || !formData.payment_date}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;