import React, { useState } from 'react';
import EstimateList from './components/EstimateList';
import EstimateForm from './components/EstimateForm';
import EstimateDetail from './components/EstimateDetail';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import PaymentForm from './components/PaymentForm';
import ClientList from './components/ClientList';
import ClientForm from './components/ClientForm';
import { Home, Menu, X } from 'lucide-react';
import { useEstimates } from './hooks/useEstimates';
import { useInvoices } from './hooks/useInvoices';
import { CreateEstimateRequest, Invoice, RecordPaymentRequest } from './services/api';

type View = 'dashboard' | 'estimates' | 'estimate-form' | 'estimate-detail' | 'invoices' | 'invoice-detail' | 'clients' | 'client-form' | 'client-detail';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isEstimateEditing, setIsEstimateEditing] = useState(false);
  const [isInvoiceEditing, setIsInvoiceEditing] = useState(false);
  const [isClientEditing, setIsClientEditing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Get estimates and invoices for dashboard stats
  const { estimates: dashboardEstimates } = useEstimates({ limit: 100 });
  const { invoices: dashboardInvoices, recordPayment } = useInvoices({ limit: 100 });

  const handleCreateEstimate = () => {
    setCurrentView('estimate-form');
  };

  const handleViewEstimate = (id: number) => {
    setSelectedEstimateId(id);
    setIsEstimateEditing(false);
    setCurrentView('estimate-detail');
  };

  const handleEditEstimate = (id: number) => {
    setSelectedEstimateId(id);
    setIsEstimateEditing(true);
    setCurrentView('estimate-detail');
  };

  const handleSaveEstimate = async (data: CreateEstimateRequest) => {
    try {
      // This will be handled by the EstimateForm component using the hook
      console.log('Saving estimate:', data);
      setCurrentView('estimates');
    } catch (error) {
      console.error('Failed to save estimate:', error);
    }
  };

  const handleCancelForm = () => {
    setCurrentView('estimates');
  };

  const handleViewInvoice = (id: number) => {
    setSelectedInvoiceId(id);
    setIsInvoiceEditing(false);
    setCurrentView('invoice-detail');
  };

  const handleEditInvoice = (id: number) => {
    setSelectedInvoiceId(id);
    setIsInvoiceEditing(true);
    setCurrentView('invoice-detail');
  };

  const handleRecordPayment = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
  };

  const handlePaymentSave = async (paymentData: RecordPaymentRequest): Promise<boolean> => {
    if (!paymentInvoice) return false;
    
    const success = await recordPayment(paymentInvoice.id, paymentData);
    if (success) {
      setPaymentInvoice(null);
    }
    return success;
  };

  const handlePaymentCancel = () => {
    setPaymentInvoice(null);
  };

  const handleConvertEstimate = () => {
    setCurrentView('estimates'); // Navigate to estimates to select one to convert
  };

  const handleCreateClient = () => {
    setSelectedClientId(null);
    setIsClientEditing(false);
    setCurrentView('client-form');
  };

  const handleViewClient = (id: number) => {
    setSelectedClientId(id);
    setIsClientEditing(false);
    setCurrentView('client-detail');
  };

  const handleEditClient = (id: number) => {
    setSelectedClientId(id);
    setIsClientEditing(true);
    setCurrentView('client-form');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'estimates':
        return (
          <EstimateList 
            onCreateNew={handleCreateEstimate}
            onViewEstimate={handleViewEstimate}
            onEditEstimate={handleEditEstimate}
          />
        );
      case 'estimate-form':
        return (
          <EstimateForm 
            onSave={() => setCurrentView('estimates')}
            onCancel={handleCancelForm}
          />
        );
      case 'estimate-detail':
        return selectedEstimateId ? (
          <EstimateDetail 
            estimateId={selectedEstimateId}
            onBack={() => setCurrentView('estimates')}
            initialEditMode={isEstimateEditing}
          />
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">No estimate selected</p>
            <button 
              onClick={() => setCurrentView('estimates')}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Estimates
            </button>
          </div>
        );
      case 'invoices':
        return (
          <InvoiceList
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onRecordPayment={handleRecordPayment}
            onConvertEstimate={handleConvertEstimate}
          />
        );
      case 'invoice-detail':
        return selectedInvoiceId ? (
          <InvoiceDetail 
            invoiceId={selectedInvoiceId}
            onBack={() => setCurrentView('invoices')}
            initialEditMode={isInvoiceEditing}
          />
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">No invoice selected</p>
            <button 
              onClick={() => setCurrentView('invoices')}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Invoices
            </button>
          </div>
        );
      case 'clients':
        return (
          <ClientList
            onCreateNew={handleCreateClient}
            onViewClient={handleViewClient}
            onEditClient={handleEditClient}
          />
        );
      case 'client-form':
        return (
          <ClientForm
            onSave={() => setCurrentView('clients')}
            onCancel={() => setCurrentView('clients')}
            clientId={isClientEditing ? selectedClientId : null}
          />
        );
      case 'client-detail':
        return selectedClientId ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Client Details</h2>
            <p className="text-gray-600">Client detail view would go here</p>
            <button 
              onClick={() => setCurrentView('clients')}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Clients
            </button>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">No client selected</p>
            <button 
              onClick={() => setCurrentView('clients')}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Clients
            </button>
          </div>
        );
      default:
        return (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 bg-gradient-to-br from-white to-slate-50">
              <div className="text-center">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-purple-800 bg-clip-text text-transparent mb-4">
                  Welcome to PaintPro Manager
                </h2>
                <p className="text-xl text-slate-600 mb-12 max-w-3xl mx-auto">
                  Streamline your painting business with professional estimates, invoices, and client management.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  <button 
                    onClick={() => setCurrentView('estimates')}
                    className="group bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 p-8 rounded-2xl border border-blue-200/50 hover:border-blue-300/50 transition-all duration-300 text-left shadow-lg hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Estimates</h3>
                    <p className="text-slate-600 leading-relaxed">Create professional project estimates with detailed scoping and pricing</p>
                  </button>
                  
                  <button 
                    onClick={() => setCurrentView('invoices')}
                    className="group bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 p-8 rounded-2xl border border-emerald-200/50 hover:border-emerald-300/50 transition-all duration-300 text-left shadow-lg hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Invoices</h3>
                    <p className="text-slate-600 leading-relaxed">Convert estimates to invoices and track payments seamlessly</p>
                  </button>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-200/50 text-left opacity-75 shadow-lg">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Quality Control</h3>
                    <p className="text-slate-600 leading-relaxed mb-3">Document progress with photos and checklists</p>
                    <span className="inline-flex px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">Coming Soon</span>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl border border-orange-200/50 text-left opacity-75 shadow-lg">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 7.89a1 1 0 001.414 0L21 9M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Communications</h3>
                    <p className="text-slate-600 leading-relaxed mb-3">Automated follow-ups and client communications</p>
                    <span className="inline-flex px-3 py-1 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">Coming Soon</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {dashboardEstimates.filter(e => ['draft', 'sent'].includes(e.status)).length}
                    </div>
                    <div className="text-sm font-medium text-slate-600">Active Estimates</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      ${dashboardInvoices
                        .filter(i => ['sent', 'overdue'].includes(i.status))
                        .reduce((sum, i) => sum + (i.total_amount - i.paid_amount), 0)
                        .toFixed(0)}
                    </div>
                    <div className="text-sm font-medium text-slate-600">Outstanding Revenue</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {dashboardInvoices.filter(i => i.status === 'paid').length}
                    </div>
                    <div className="text-sm font-medium text-slate-600">Paid Invoices</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      {new Set(dashboardEstimates.map(e => e.client_id)).size}
                    </div>
                    <div className="text-sm font-medium text-slate-600">Active Clients</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-purple-800 bg-clip-text text-transparent mb-6">Quick Actions</h3>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <button 
                  onClick={handleCreateEstimate}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  Create New Estimate
                </button>
                <button 
                  onClick={() => setCurrentView('clients')}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                    </svg>
                  </div>
                  Manage Clients
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 backdrop-blur-lg shadow-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-3 text-lg sm:text-2xl font-bold text-white hover:text-purple-200 transition-all duration-300"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                  </svg>
                </div>
                <span className="hidden sm:inline">PaintPro Manager</span>
                <span className="sm:hidden">PaintPro</span>
              </button>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  currentView === 'dashboard' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('estimates')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  currentView === 'estimates' || currentView === 'estimate-form' || currentView === 'estimate-detail'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Estimates
              </button>
              <button
                onClick={() => setCurrentView('invoices')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  currentView === 'invoices' || currentView === 'invoice-detail'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
                Invoices
              </button>
              <button
                onClick={() => setCurrentView('clients')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  currentView === 'clients' || currentView === 'client-form' || currentView === 'client-detail' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                </svg>
                Clients
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 py-4">
              <nav className="flex flex-col space-y-2">
                <button
                  onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                    currentView === 'dashboard' 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                  </svg>
                  Dashboard
                </button>
                <button
                  onClick={() => { setCurrentView('estimates'); setIsMobileMenuOpen(false); }}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                    currentView === 'estimates' || currentView === 'estimate-form' || currentView === 'estimate-detail'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Estimates
                </button>
                <button
                  onClick={() => { setCurrentView('invoices'); setIsMobileMenuOpen(false); }}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                    currentView === 'invoices' || currentView === 'invoice-detail'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                  </svg>
                  Invoices
                </button>
                <button
                  onClick={() => { setCurrentView('clients'); setIsMobileMenuOpen(false); }}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                    currentView === 'clients' || currentView === 'client-form' || currentView === 'client-detail' 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                  Clients
                </button>
                
                {/* Quick Actions in Mobile Menu */}
                <div className="border-t border-white/10 pt-4 mt-4">
                  <p className="text-slate-400 text-xs font-medium mb-3 px-4">QUICK ACTIONS</p>
                  <button
                    onClick={() => { handleCreateEstimate(); setIsMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 text-slate-300 hover:text-white hover:bg-white/10"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Create New Estimate
                  </button>
                  <button
                    onClick={() => { handleCreateClient(); setIsMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 text-slate-300 hover:text-white hover:bg-white/10"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Create New Client
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>

      {/* Payment Form Modal */}
      {paymentInvoice && (
        <PaymentForm
          invoice={paymentInvoice}
          onSave={handlePaymentSave}
          onCancel={handlePaymentCancel}
        />
      )}
    </div>
  );
}

export default App;