import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Eye, Edit, DollarSign, Plus, FileText, AlertCircle, CheckCircle, Send, XCircle } from 'lucide-react';
import { useInvoices } from '../hooks/useInvoices';
import { Invoice } from '../services/api';

interface InvoiceListProps {
  onViewInvoice: (id: number) => void;
  onEditInvoice: (id: number) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onConvertEstimate: () => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ onViewInvoice, onEditInvoice, onRecordPayment, onConvertEstimate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedInvoiceForVoid, setSelectedInvoiceForVoid] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const filters = useMemo(() => ({
    page: currentPage,
    limit: 20,
    search: debouncedSearchTerm,
    status: statusFilter === 'all' ? undefined : statusFilter,
    overdue: overdueFilter
  }), [currentPage, debouncedSearchTerm, statusFilter, overdueFilter]);

  const {
    invoices,
    loading,
    error,
    total,
    totalPages,
    refetch,
    updateInvoiceStatus,
    voidInvoice
  } = useInvoices(filters);

  // Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, overdueFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      case 'void': return 'bg-gray-300 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleVoidInvoice = (invoice: Invoice) => {
    setSelectedInvoiceForVoid(invoice);
    setVoidReason('');
    setVoidModalOpen(true);
  };

  const handleVoidConfirm = async () => {
    if (!selectedInvoiceForVoid || !voidReason.trim()) return;

    const success = await voidInvoice(selectedInvoiceForVoid.id, voidReason.trim());
    if (success) {
      setVoidModalOpen(false);
      setSelectedInvoiceForVoid(null);
      setVoidReason('');
      refetch();
    }
  };

  const handleVoidCancel = () => {
    setVoidModalOpen(false);
    setSelectedInvoiceForVoid(null);
    setVoidReason('');
  };

  const getPaymentStatusColor = (invoice: Invoice) => {
    if (invoice.paid_amount === 0) {
      return 'text-red-600'; // Not paid
    } else if (invoice.paid_amount >= invoice.total_amount) {
      return 'text-green-600'; // Fully paid
    } else {
      return 'text-yellow-600'; // Partially paid
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleStatusUpdate = async (id: number, newStatus: Invoice['status']) => {
    const success = await updateInvoiceStatus(id, newStatus);
    if (success) {
      refetch();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          <span className="font-medium">Error loading invoices</span>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
        <button 
          onClick={refetch}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-purple-800 bg-clip-text text-transparent">Invoices</h2>
          <p className="text-xl text-slate-600 mt-2">Manage invoices and track payments efficiently</p>
        </div>
        <button
          onClick={onConvertEstimate}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <FileText size={18} />
          </div>
          Convert Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => {
              e.preventDefault();
              setSearchTerm(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            className="w-full pl-12 pr-6 py-4 bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 shadow-lg placeholder:text-slate-400 text-slate-700"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-4 shadow-lg border border-white/20">
            <Filter size={20} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-slate-700 font-medium"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
              <option value="void">Void</option>
            </select>
          </div>
          <label className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-4 shadow-lg border border-white/20 text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={overdueFilter}
              onChange={(e) => setOverdueFilter(e.target.checked)}
              className="rounded-lg border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            Overdue Only
          </label>
        </div>
      </div>

      {/* Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {invoices.map((invoice) => {
          const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'paid';
          const outstandingAmount = invoice.total_amount - invoice.paid_amount;
          
          return (
            <div
              key={invoice.id}
              className={`group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ${
                invoice.status === 'void' ? 'opacity-60 grayscale' : ''
              } ${isOverdue && invoice.status !== 'void' ? 'ring-2 ring-red-300 bg-red-50/30' : ''}`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">
                    {invoice.invoice_number || `Draft #${invoice.id}`}
                    {invoice.status === 'void' && (
                      <span className="ml-2 text-xs text-gray-500">(VOID)</span>
                    )}
                  </h3>
                  <p className="text-slate-600 text-sm line-clamp-2">{invoice.title}</p>
                  {invoice.estimate_number && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">From: {invoice.estimate_number}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status).replace('bg-', 'bg-gradient-to-r from-').replace(' text-', ' to-').replace('-100', '-200')} text-white shadow-lg`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                  {isOverdue && (
                    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client</p>
                    <p className="text-slate-800 font-semibold">{invoice.client_name || 'Unknown Client'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Status</p>
                    <p className={`font-semibold ${getPaymentStatusColor(invoice)}`}>
                      {invoice.paid_amount === 0 ? 'Unpaid' : 
                       invoice.paid_amount >= invoice.total_amount ? 'Paid in Full' : 'Partially Paid'}
                    </p>
                    {outstandingAmount > 0 && (
                      <p className="text-xs text-slate-500">Outstanding: {formatCurrency(outstandingAmount)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Due Date</p>
                    <p className={`text-slate-600 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                      {invoice.due_date ? formatDate(invoice.due_date) : 'No due date'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewInvoice(invoice.id)}
                    className="w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => onEditInvoice(invoice.id)}
                      className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => handleStatusUpdate(invoice.id, 'sent')}
                      className="w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                      title="Send to Client"
                    >
                      <Send size={16} />
                    </button>
                  )}
                  {invoice.status === 'sent' && (
                    <button
                      onClick={() => handleStatusUpdate(invoice.id, 'paid')}
                      className="w-9 h-9 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                      title="Mark as Paid"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  {outstandingAmount > 0 && invoice.status !== 'paid' && invoice.status !== 'void' && (
                    <button
                      onClick={() => onRecordPayment(invoice)}
                      className="w-9 h-9 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                      title="Record Payment"
                    >
                      <DollarSign size={16} />
                    </button>
                  )}
                  {(invoice.status === 'draft' || invoice.status === 'sent') && (
                    <button
                      onClick={() => handleVoidInvoice(invoice)}
                      className="w-9 h-9 bg-gray-500 hover:bg-gray-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                      title="Void Invoice"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {invoices.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileText className="text-slate-400" size={36} />
          </div>
          <h3 className="text-2xl font-bold text-slate-700 mb-2">No invoices found</h3>
          <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all' || overdueFilter
              ? 'Try adjusting your search or filter criteria' 
              : 'Convert approved estimates to create your first invoice'}
          </p>
          {!searchTerm && statusFilter === 'all' && !overdueFilter && (
            <button
              onClick={onConvertEstimate}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl mx-auto"
            >
              <FileText size={20} />
              Convert Your First Estimate
            </button>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center mr-4">
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent">
                {total}
              </div>
              <div className="text-sm font-medium text-slate-600">Total Invoices</div>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
              <AlertCircle className="text-white" size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                {invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length}
              </div>
              <div className="text-sm font-medium text-slate-600">Outstanding</div>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mr-4">
              <CheckCircle className="text-white" size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                {invoices.filter(i => i.status === 'paid').length}
              </div>
              <div className="text-sm font-medium text-slate-600">Paid</div>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
              <DollarSign className="text-white" size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {formatCurrency(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0))}
              </div>
              <div className="text-sm font-medium text-slate-600">Total Revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Void Confirmation Modal */}
      {voidModalOpen && selectedInvoiceForVoid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="text-red-600" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Void Invoice</h3>
            </div>

            <p className="text-slate-600 mb-4">
              Are you sure you want to void invoice <strong>{selectedInvoiceForVoid.invoice_number || `Draft #${selectedInvoiceForVoid.id}`}</strong>?
            </p>

            <p className="text-sm text-slate-500 mb-6">
              This action will mark the invoice as void and revert the associated estimate back to approved status.
              The invoice number will not be reused.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for voiding <span className="text-red-500">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g., Project cancelled, Duplicate invoice, Client changed requirements..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={3}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleVoidCancel}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidConfirm}
                disabled={!voidReason.trim()}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Void Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;