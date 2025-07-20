import React, { useState } from 'react';
import { ArrowLeft, MapPin, Clock, DollarSign, FileText, User, Download, Edit, Copy, GitBranch, History } from 'lucide-react';
import { useEstimate, useEstimates } from '../hooks/useEstimates';
import { generateEstimatePDF } from '../utils/pdfGenerator';
import EstimateEdit from './EstimateEdit';
import EstimateForm from './EstimateForm';
import EstimateVersionHistory from './EstimateVersionHistory';
import EstimateRevisionForm from './EstimateRevisionForm';
import { Estimate } from '../services/api';

interface EstimateDetailProps {
  estimateId: number;
  onBack: () => void;
  initialEditMode?: boolean;
}

const EstimateDetail: React.FC<EstimateDetailProps> = ({ estimateId, onBack, initialEditMode = false }) => {
  const { estimate, loading, error, refetch } = useEstimate(estimateId);
  const { createEstimate } = useEstimates();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isCreatingRevision, setIsCreatingRevision] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);

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
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadPDF = () => {
    if (estimate) {
      generateEstimatePDF(estimate);
    }
  };

  const handleSaveEdit = (updatedEstimate: Estimate) => {
    setIsEditing(false);
    refetch(); // Refresh the estimate data
  };

  const handleCreateRevision = async () => {
    if (!estimate) return;
    
    // Convert the current estimate to a new estimate request
    const revisionData = {
      client_id: estimate.client_id,
      title: `${estimate.title} (Revision ${estimate.revision_number + 1})`,
      description: estimate.description,
      valid_until: estimate.valid_until,
      markup_percentage: estimate.markup_percentage,
      terms_and_notes: estimate.terms_and_notes,
      project_areas: estimate.project_areas?.map(area => ({
        area_name: area.area_name,
        area_type: area.area_type,
        surface_type: area.surface_type,
        square_footage: area.square_footage,
        ceiling_height: area.ceiling_height,
        prep_requirements: area.prep_requirements,
        paint_type: area.paint_type,
        paint_brand: area.paint_brand,
        paint_color: area.paint_color,
        finish_type: area.finish_type,
        number_of_coats: area.number_of_coats,
        labor_hours: area.labor_hours,
        labor_rate: area.labor_rate,
        material_cost: area.material_cost,
        notes: area.notes
      })) || []
    };

    setIsCreatingRevision(true);
  };

  const handleSaveRevision = () => {
    setIsCreatingRevision(false);
    onBack(); // Go back to estimates list to see the new revision
  };

  const handleCreateNewRevision = async (revisionData: any) => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}/revisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(revisionData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowRevisionForm(false);
        refetch(); // Refresh the current estimate
        // Optionally show success message
      } else {
        throw new Error(result.error || 'Failed to create revision');
      }
    } catch (error) {
      console.error('Error creating revision:', error);
      // Handle error - could show toast notification
    }
  };

  const handleViewVersion = (versionId: number) => {
    // Navigate to the specific version
    // For now, we'll just close the history and potentially navigate
    setShowVersionHistory(false);
    if (versionId !== estimateId) {
      // Could navigate to the specific version
      window.location.href = `/estimates/${versionId}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <span className="font-medium">Error loading estimate</span>
        </div>
        <p className="text-red-600 mt-2">{error || 'Estimate not found'}</p>
        <button 
          onClick={onBack}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <EstimateEdit
        estimate={estimate}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  if (isCreatingRevision && estimate) {
    const revisionData = {
      client_id: estimate.client_id,
      title: `${estimate.title} (Revision ${estimate.revision_number + 1})`,
      description: estimate.description,
      valid_until: estimate.valid_until,
      markup_percentage: estimate.markup_percentage,
      terms_and_notes: estimate.terms_and_notes,
      parent_estimate_id: estimate.id,
      revision_number: estimate.revision_number + 1,
      project_areas: estimate.project_areas?.map(area => ({
        area_name: area.area_name,
        area_type: area.area_type,
        surface_type: area.surface_type,
        square_footage: area.square_footage,
        ceiling_height: area.ceiling_height,
        prep_requirements: area.prep_requirements,
        paint_type: area.paint_type,
        paint_brand: area.paint_brand,
        paint_color: area.paint_color,
        finish_type: area.finish_type,
        number_of_coats: area.number_of_coats,
        labor_hours: area.labor_hours,
        labor_rate: area.labor_rate,
        material_cost: area.material_cost,
        notes: area.notes
      })) || []
    };

    return (
      <EstimateForm
        onSave={handleSaveRevision}
        onCancel={() => setIsCreatingRevision(false)}
        initialData={revisionData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Estimates
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowVersionHistory(true)}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <History size={18} />
            Version History
          </button>

          {estimate.status === 'draft' && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Edit size={18} />
              Edit
            </button>
          )}

          {(estimate.status === 'sent' || estimate.status === 'approved') && (
            <>
              <button
                onClick={() => setShowRevisionForm(true)}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <GitBranch size={18} />
                Create Revision
              </button>
              
              <button
                onClick={handleCreateRevision}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Copy size={18} />
                Duplicate Estimate
              </button>
            </>
          )}

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Estimate Header */}
        <div className="bg-blue-50 px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="text-blue-600" size={28} />
                {estimate.estimate_number}
                {estimate.revision_number > 1 && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 text-sm font-semibold rounded">
                    v{estimate.revision_number}
                  </span>
                )}
              </h1>
              <p className="text-lg text-gray-700 mt-1">{estimate.title}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(estimate.status)}`}>
                {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
              </span>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(estimate.total_amount)}</div>
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
              <div className="text-gray-900">{estimate.client_name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Email</span>
              <div className="text-gray-900">{estimate.client_email || 'N/A'}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Phone</span>
              <div className="text-gray-900">{estimate.client_phone || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Estimate Details */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="text-blue-600" size={20} />
            Estimate Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Created Date</span>
              <div className="text-gray-900">{formatDate(estimate.created_at)}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Valid Until</span>
              <div className="text-gray-900">{estimate.valid_until ? formatDate(estimate.valid_until) : 'No expiration'}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Revision</span>
              <div className="text-gray-900">#{estimate.revision_number}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Markup</span>
              <div className="text-gray-900">{estimate.markup_percentage}%</div>
            </div>
          </div>
          {estimate.description && (
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-500">Description</span>
              <div className="text-gray-900 mt-1">{estimate.description}</div>
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="text-blue-600" size={20} />
            Cost Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-500">Labor Cost</span>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(estimate.labor_cost)}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-500">Material Cost</span>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(estimate.material_cost)}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-500">Markup ({estimate.markup_percentage}%)</span>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency((estimate.labor_cost + estimate.material_cost) * (estimate.markup_percentage / 100))}
              </div>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg border-2 border-blue-200">
              <span className="text-sm font-medium text-gray-500">Total Amount</span>
              <div className="text-xl font-bold text-blue-700">{formatCurrency(estimate.total_amount)}</div>
            </div>
          </div>
        </div>

        {/* Terms and Notes */}
        {estimate.terms_and_notes && (
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              Terms and Notes
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-gray-900 whitespace-pre-wrap">{estimate.terms_and_notes}</div>
            </div>
          </div>
        )}

        {/* Project Areas */}
        {estimate.project_areas && estimate.project_areas.length > 0 && (
          <div className="px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="text-blue-600" size={20} />
              Project Areas
            </h3>
            <div className="space-y-4">
              {estimate.project_areas.map((area, index) => (
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
                      <span className="text-gray-500">Labor Rate:</span>
                      <div className="font-medium">{area.labor_rate ? formatCurrency(area.labor_rate) : 'N/A'}</div>
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

      {/* Version Control Modals */}
      {showVersionHistory && (
        <EstimateVersionHistory
          estimateId={estimateId}
          onClose={() => setShowVersionHistory(false)}
          onViewVersion={handleViewVersion}
        />
      )}

      {showRevisionForm && estimate && (
        <EstimateRevisionForm
          estimateId={estimateId}
          currentEstimate={estimate}
          onSave={handleCreateNewRevision}
          onCancel={() => setShowRevisionForm(false)}
        />
      )}
    </div>
  );
};

export default EstimateDetail;