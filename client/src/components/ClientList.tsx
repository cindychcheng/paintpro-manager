import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, AlertCircle, MapPin, Phone, Mail } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { Client } from '../services/api';

interface ClientListProps {
  onCreateNew: () => void;
  onViewClient: (id: number) => void;
  onEditClient: (id: number) => void;
}

const ClientList: React.FC<ClientListProps> = ({ onCreateNew, onViewClient, onEditClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filters = useMemo(() => ({
    page: currentPage,
    limit: 20,
    search: debouncedSearchTerm
  }), [currentPage, debouncedSearchTerm]);

  const {
    clients,
    loading,
    error,
    total,
    totalPages,
    refetch,
    deleteClient
  } = useClients(filters);

  // Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleDelete = async (id: number, clientName: string) => {
    if (window.confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
      const success = await deleteClient(id);
      if (success) {
        refetch();
      }
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
          <span className="font-medium">Error loading clients</span>
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
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-purple-800 bg-clip-text text-transparent">Clients</h2>
          <p className="text-xl text-slate-600 mt-2">Manage your client information and contacts</p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Plus size={18} />
          </div>
          New Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search clients by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => {
            e.preventDefault();
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          className="w-full pl-12 pr-6 py-4 bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 shadow-lg placeholder:text-slate-400 text-slate-700"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div 
            key={client.id} 
            className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >
            {/* Card Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 mb-1">{client.name}</h3>
                {client.email && (
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Mail size={14} />
                    <span className="text-sm">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} />
                    <span className="text-sm">{client.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-3 mb-4">
              {/* Billing Address */}
              {(client.address || client.city || client.state) && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Billing Address</p>
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin size={14} className="mt-0.5" />
                    <div className="text-sm">
                      {client.address && <div>{client.address}</div>}
                      <div>
                        {client.city && <span>{client.city}</span>}
                        {client.state && <span>{client.city ? ', ' : ''}{client.state}</span>}
                        {client.zip_code && <span> {client.zip_code}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Address */}
              {(client.job_address || client.job_city || client.job_state) && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Job Address</p>
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin size={14} className="mt-0.5" />
                    <div className="text-sm">
                      {client.job_address && <div>{client.job_address}</div>}
                      <div>
                        {client.job_city && <span>{client.job_city}</span>}
                        {client.job_state && <span>{client.job_city ? ', ' : ''}{client.job_state}</span>}
                        {client.job_zip_code && <span> {client.job_zip_code}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {client.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{client.notes}</p>
                </div>
              )}
            </div>

            {/* Card Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewClient(client.id)}
                  className="w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => onEditClient(client.id)}
                  className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
              </div>
              <button
                onClick={() => handleDelete(client.id, client.name)}
                className="w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <MapPin className="text-slate-400" size={36} />
          </div>
          <h3 className="text-2xl font-bold text-slate-700 mb-2">No clients found</h3>
          <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto">
            {searchTerm 
              ? 'Try adjusting your search criteria' 
              : 'Add your first client to start managing your contacts and project information'}
          </p>
          {!searchTerm && (
            <button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl mx-auto"
            >
              <Plus size={20} />
              Add Your First Client
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white/70 backdrop-blur-sm border border-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-white/70 backdrop-blur-sm border border-white/20 rounded-lg">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white/70 backdrop-blur-sm border border-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
              <MapPin className="text-white" size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {total}
              </div>
              <div className="text-sm font-medium text-slate-600">Total Clients</div>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mr-4">
              <Mail className="text-white" size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {clients.filter(c => c.email).length}
              </div>
              <div className="text-sm font-medium text-slate-600">With Email</div>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
              <Phone className="text-white" size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {clients.filter(c => c.phone).length}
              </div>
              <div className="text-sm font-medium text-slate-600">With Phone</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientList;