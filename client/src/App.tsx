import React, { useState } from 'react';
import EstimateList from './components/EstimateList';
import EstimateForm from './components/EstimateForm';
import EstimateDetail from './components/EstimateDetail';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import PaymentForm from './components/PaymentForm';
import { FileText, DollarSign, CheckSquare, Mail, Home, Users } from 'lucide-react';
import { useEstimates } from './hooks/useEstimates';
import { useInvoices } from './hooks/useInvoices';
import { CreateEstimateRequest, Invoice, RecordPaymentRequest } from './services/api';

type View = 'dashboard' | 'estimates' | 'estimate-form' | 'estimate-detail' | 'invoices' | 'invoice-detail' | 'clients';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isEstimateEditing, setIsEstimateEditing] = useState(false);
  const [isInvoiceEditing, setIsInvoiceEditing] = useState(false);
  
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Clients</h2>
            <p className="text-gray-600">Client management would go here</p>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <button 
                    onClick={() => setCurrentView('estimates')}
                    className="group bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 p-8 rounded-2xl border border-blue-200/50 hover:border-blue-300/50 transition-all duration-300 text-left shadow-lg hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileText className="text-white" size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Estimates</h3>
                    <p className="text-slate-600 leading-relaxed">Create professional project estimates with detailed scoping and pricing</p>
                  </button>
                  
                  <button 
                    onClick={() => setCurrentView('invoices')}
                    className="group bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 p-8 rounded-2xl border border-emerald-200/50 hover:border-emerald-300/50 transition-all duration-300 text-left shadow-lg hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <DollarSign className="text-white" size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Invoices</h3>
                    <p className="text-slate-600 leading-relaxed">Convert estimates to invoices and track payments seamlessly</p>
                  </button>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-200/50 text-left opacity-75 shadow-lg">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mb-4">
                      <CheckSquare className="text-white" size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Quality Control</h3>
                    <p className="text-slate-600 leading-relaxed mb-3">Document progress with photos and checklists</p>
                    <span className="inline-flex px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">Coming Soon</span>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl border border-orange-200/50 text-left opacity-75 shadow-lg">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-4">
                      <Mail className="text-white" size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Communications</h3>
                    <p className="text-slate-600 leading-relaxed mb-3">Automated follow-ups and client communications</p>
                    <span className="inline-flex px-3 py-1 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">Coming Soon</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                    <FileText className="text-white" size={20} />
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
                    <DollarSign className="text-white" size={20} />
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
                    <CheckSquare className="text-white" size={20} />
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
                    <Users className="text-white" size={20} />
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
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleCreateEstimate}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  Create New Estimate
                </button>
                <button 
                  onClick={() => setCurrentView('clients')}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Users size={18} />
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
      <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 backdrop-blur-lg shadow-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-3 text-2xl font-bold text-white hover:text-purple-200 transition-all duration-300"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Home size={24} className="text-white" />
                </div>
                PaintPro Manager
              </button>
            </div>
            
            {/* Navigation */}
            <nav className="flex space-x-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  currentView === 'dashboard' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                <Home size={16} />
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
                <FileText size={16} />
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
                <DollarSign size={16} />
                Invoices
              </button>
              <button
                onClick={() => setCurrentView('clients')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  currentView === 'clients' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                <Users size={16} />
                Clients
              </button>
            </nav>
          </div>
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