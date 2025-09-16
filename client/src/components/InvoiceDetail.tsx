import React, { useState } from 'react';
import { ArrowLeft, MapPin, Clock, DollarSign, FileText, User, CreditCard, Download, Send, CheckCircle, RefreshCw, Edit, Trash2, Edit2 } from 'lucide-react';
import { useInvoice } from '../hooks/useInvoices';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import InvoiceEdit from './InvoiceEdit';
import PaymentEditForm from './PaymentEditForm';
import { Invoice, Payment, RecordPaymentRequest, apiService } from '../services/api';

interface InvoiceDetailProps {
  invoiceId: number;
  onBack: () => void;
  initialEditMode?: boolean;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoiceId, onBack, initialEditMode = false }) => {
  const { invoice, loading, error, refetch } = useInvoice(invoiceId);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
  };

  const handleUpdatePayment = async (paymentData: Partial<RecordPaymentRequest>) => {
    if (!editingPayment) return false;

    try {
      await apiService.updatePayment(editingPayment.id, paymentData);
      await refetch(); // Refresh the invoice data
      setEditingPayment(null);
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      return false;
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      await apiService.deletePayment(paymentId);
      await refetch(); // Refresh the invoice data
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment. Please try again.');
    }
  };

  const getPaymentStatusColor = (invoice: any) => {
    if (invoice.paid_amount === 0) {
      return 'text-red-600'; // Not paid
    } else if (invoice.paid_amount >= invoice.total_amount) {
      return 'text-green-600'; // Fully paid
    } else {
      return 'text-yellow-600'; // Partially paid
    }
  };

  const handleDownloadPDF = async () => {
    if (invoice) {
      try {
        await generateInvoicePDF(invoice);
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    }
  };

  const handleSaveEdit = (updatedInvoice: Invoice) => {
    setIsEditing(false);
    refetch(); // Refresh the invoice data
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await refetch(); // Refresh the invoice data
      } else {
        console.error('Failed to update status');
        alert('Failed to update invoice status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating invoice status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <span className="font-medium">Error loading invoice</span>
        </div>
        <p className="text-red-600 mt-2">{error || 'Invoice not found'}</p>
        <button 
          onClick={onBack}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const outstandingAmount = invoice.total_amount - invoice.paid_amount;
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'paid';

  if (isEditing) {
    return (
      <InvoiceEdit
        invoice={invoice}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Invoices
        </button>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Action Buttons */}
          {invoice.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('sent')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send size={18} />
              Send to Client
            </button>
          )}
          
          {invoice.status === 'sent' && (
            <>
              <button
                onClick={() => handleStatusChange('paid')}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle size={18} />
                Mark as Paid
              </button>
              <button
                onClick={() => handleStatusChange('draft')}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={18} />
                Back to Draft
              </button>
            </>
          )}
          
          {invoice.status === 'paid' && (
            <button
              onClick={() => handleStatusChange('sent')}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <RefreshCw size={18} />
              Mark as Unpaid
            </button>
          )}

          {/* Edit Button (only for draft invoices) */}
          {invoice.status === 'draft' && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Edit size={18} />
              Edit
            </button>
          )}

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-blue-50 px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="text-blue-600" size={28} />
                {invoice.invoice_number}
              </h1>
              <p className="text-lg text-gray-700 mt-1">{invoice.title}</p>
              {invoice.estimate_number && (
                <p className="text-sm text-blue-600">From estimate: {invoice.estimate_number}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
              {isOverdue && (
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                  Overdue
                </span>
              )}
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</div>
                <div className="text-sm text-gray-600">Total Amount</div>
              </div>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="text-blue-600" size={20} />
            Client Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Name</span>
              <div className="text-gray-900">{invoice.client_name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Email</span>
              <div className="text-gray-900">{invoice.client_email || 'N/A'}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Phone</span>
              <div className="text-gray-900">{invoice.client_phone || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="text-blue-600" size={20} />
            Invoice Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Issue Date</span>
              <div className="text-gray-900">{formatDate(invoice.created_at)}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Due Date</span>
              <div className={`${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                {invoice.due_date ? formatDate(invoice.due_date) : 'No due date'}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Payment Terms</span>
              <div className="text-gray-900">{invoice.payment_terms}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Status</span>
              <div className={`font-medium ${getPaymentStatusColor(invoice)}`}>
                {invoice.paid_amount === 0 ? 'Unpaid' : 
                 invoice.paid_amount >= invoice.total_amount ? 'Paid in Full' : 'Partially Paid'}
              </div>
            </div>
          </div>
          {invoice.description && (
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-500">Description</span>
              <div className="text-gray-900 mt-1">{invoice.description}</div>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="text-blue-600" size={20} />
            Payment Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-500">Total Amount</span>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(invoice.total_amount)}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-500">Amount Paid</span>
              <div className="text-xl font-bold text-green-600">{formatCurrency(invoice.paid_amount)}</div>
            </div>
            <div className={`p-4 rounded-lg ${outstandingAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <span className="text-sm font-medium text-gray-500">Outstanding</span>
              <div className={`text-xl font-bold ${outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(outstandingAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="text-blue-600" size={20} />
              Payment History
            </h3>
            <div className="space-y-3">
              {invoice.payments.map((payment, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {payment.payment_method}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(payment.payment_date)}
                        </div>
                      </div>
                      {payment.reference_number && (
                        <div className="text-sm text-gray-500 mt-1">
                          Reference: {payment.reference_number}
                        </div>
                      )}
                      {payment.notes && (
                        <div className="text-sm text-gray-600 mt-1">
                          {payment.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditPayment(payment)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit payment"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePayment(payment.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete payment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terms and Notes */}
        {invoice.terms_and_notes && (
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              Terms and Notes
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-gray-900 whitespace-pre-wrap">{invoice.terms_and_notes}</div>
            </div>
          </div>
        )}

        {/* Project Areas */}
        {invoice.project_areas && invoice.project_areas.length > 0 && (
          <div className="px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="text-blue-600" size={20} />
              Project Areas
            </h3>
            <div className="space-y-4">
              {invoice.project_areas.map((area, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900">{area.area_name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      area.area_type === 'indoor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {area.area_type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Surface:</span>
                      <div className="font-medium">{area.surface_type || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <div className="font-medium">{area.square_footage ? `${area.square_footage} sq ft` : 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Labor Hours:</span>
                      <div className="font-medium">{area.labor_hours || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Material Cost:</span>
                      <div className="font-medium">{area.material_cost ? formatCurrency(area.material_cost) : 'N/A'}</div>
                    </div>
                  </div>
                  {area.paint_type && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Paint Type:</span>
                        <div className="font-medium">{area.paint_type}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Brand:</span>
                        <div className="font-medium">{area.paint_brand || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Color:</span>
                        <div className="font-medium">{area.paint_color || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Coats:</span>
                        <div className="font-medium">{area.number_of_coats || 2}</div>
                      </div>
                    </div>
                  )}
                  {area.notes && (
                    <div className="mt-3">
                      <span className="text-gray-500 text-sm">Notes:</span>
                      <div className="text-gray-900 text-sm mt-1">{area.notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Payment Edit Form Modal */}
    {editingPayment && (
      <PaymentEditForm
        payment={editingPayment}
        onSave={handleUpdatePayment}
        onCancel={() => setEditingPayment(null)}
      />
    )}
  </>
};

export default InvoiceDetail;