import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, AlertCircle, Send, CheckCircle, FileText, DollarSign } from 'lucide-react';
import { useEstimates } from '../hooks/useEstimates';
import { useInvoices } from '../hooks/useInvoices';
import { Estimate } from '../services/api';

interface EstimateListProps {
  onCreateNew: () => void;
  onViewEstimate: (id: number) => void;
  onEditEstimate: (id: number) => void;
}

// Aggressive search component to prevent ANY form submission or navigation
const SearchInput = memo(({ searchTerm, onSearchChange }: { 
  searchTerm: string;
  onSearchChange: (value: string) => void; 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="relative flex-1">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
      <input
        ref={inputRef}
        type="search"
        name="search-estimates"
        placeholder="Search estimates..."
        defaultValue={searchTerm}
        onInput={(e) => {
          const target = e.target as HTMLInputElement;
          onSearchChange(target.value);
        }}
        onKeyDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className="w-full pl-12 pr-6 py-4 bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 shadow-lg placeholder:text-slate-400 text-slate-700"
      />
    </div>
  );
});

const EstimateList: React.FC<EstimateListProps> = ({ onCreateNew, onViewEstimate, onEditEstimate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filters = useMemo(() => ({
    page: currentPage,
    limit: 20,
    search: debouncedSearchTerm,
    status: statusFilter === 'all' ? undefined : statusFilter
  }), [currentPage, debouncedSearchTerm, statusFilter]);

  const {
    estimates,
    loading,
    error,
    total,
    totalPages,
    refetch,
    updateEstimateStatus,
    deleteEstimate
  } = useEstimates(filters);

  const { convertEstimateToInvoice } = useInvoices();

  // Debug page refresh issue
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('Page is about to refresh/navigate');
      console.trace('Page refresh stack trace');
    };
    
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      console.log('Unhandled promise rejection:', e);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Reset page when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const handleStatusUpdate = async (id: number, newStatus: Estimate['status']) => {
    const success = await updateEstimateStatus(id, newStatus);
    if (success) {
      refetch();
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this estimate?')) {
      const success = await deleteEstimate(id);
      if (success) {
        refetch();
      }
    }
  };

  const handleConvertToInvoice = async (estimateId: number) => {
    const today = new Date();
    const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const success = await convertEstimateToInvoice(estimateId, {
      due_date: dueDate.toISOString().split('T')[0],
      payment_terms: 'Net 30'
    });
    
    if (success) {
      alert('Estimate successfully converted to invoice!');
      refetch(); // Refresh estimates list to show updated status
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
          <span className="font-medium">Error loading estimates</span>
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
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-purple-800 bg-clip-text text-transparent">Estimates [DEPLOYMENT TEST]</h2>
          <p className="text-xl text-slate-600 mt-2">Manage your project estimates with ease</p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Plus size={18} />
          </div>
          New Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-6">
        <SearchInput searchTerm={searchTerm} onSearchChange={setSearchTerm} />
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
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estimates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {estimates.map((estimate) => (
          <div 
            key={estimate.id} 
            className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >
            {/* Card Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 mb-1">{estimate.estimate_number}</h3>
                <p className="text-slate-600 text-sm line-clamp-2">{estimate.title}</p>
              </div>
              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(estimate.status).replace('bg-', 'bg-gradient-to-r from-').replace(' text-', ' to-').replace('-100', '-200')} text-white shadow-lg`}>
                {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
              </span>
            </div>

            {/* Card Content */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client</p>
                  <p className="text-slate-800 font-semibold">{estimate.client_name || 'Unknown Client'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {formatCurrency(estimate.total_amount)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p>
                <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(estimate.status)}`}>
                  {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewEstimate(estimate.id)}
                  className="w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => onEditEstimate(estimate.id)}
                  className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Update Buttons */}
                {estimate.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(estimate.id, 'sent')}
                      className="w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                      title="Send to Client"
                    >
                      <Send size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(estimate.id)}
                      className="w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                {estimate.status === 'sent' && (
                  <button
                    onClick={() => handleStatusUpdate(estimate.id, 'approved')}
                    className="w-9 h-9 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                    title="Mark as Approved"
                  >
                    <CheckCircle size={16} />
                  </button>
                )}
                {estimate.status === 'approved' && (
                  <button
                    onClick={() => handleConvertToInvoice(estimate.id)}
                    className="w-9 h-9 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                    title="Convert to Invoice"
                  >
                    <FileText size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {estimates.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileText className="text-slate-400" size={36} />
          </div>
          <h3 className="text-2xl font-bold text-slate-700 mb-2">No estimates found</h3>
          <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto">
            {debouncedSearchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria' 
              : 'Create your first estimate to get started with professional project proposals'}
          </p>
          {!debouncedSearchTerm && statusFilter === 'all' && (
            <button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl mx-auto"
            >
              <Plus size={20} />
              Create Your First Estimate
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
                {estimates.length}
              </div>
              <div className="text-sm font-medium text-slate-600">Total Estimates</div>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
              <Send className="text-white" size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {estimates.filter(e => e.status === 'sent').length}
              </div>
              <div className="text-sm font-medium text-slate-600">Pending Approval</div>
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
                {estimates.filter(e => e.status === 'approved').length}
              </div>
              <div className="text-sm font-medium text-slate-600">Approved</div>
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
                {formatCurrency(estimates.reduce((sum, e) => sum + e.total_amount, 0))}
              </div>
              <div className="text-sm font-medium text-slate-600">Total Value</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateList;