import React, { useState, useEffect } from 'react';
import { Clock, GitBranch, DollarSign, FileText, User, CheckCircle, XCircle, AlertCircle, Eye, ChevronDown, ChevronRight } from 'lucide-react';

interface EstimateVersion {
  id: number;
  estimate_number: string;
  title: string;
  revision_number: number;
  total_amount: number;
  labor_cost: number;
  material_cost: number;
  markup_percentage: number;
  status: string;
  created_at: string;
  revision_type?: string;
  change_summary?: string;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  is_current_version: boolean;
}

interface ChangeLogEntry {
  id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  change_type: string;
  changed_by: string;
  changed_at: string;
  revision_type?: string;
  change_summary?: string;
}

interface EstimateVersionHistoryProps {
  estimateId: number;
  onClose: () => void;
  onViewVersion: (versionId: number) => void;
}

const EstimateVersionHistory: React.FC<EstimateVersionHistoryProps> = ({ 
  estimateId, 
  onClose, 
  onViewVersion 
}) => {
  const [versions, setVersions] = useState<EstimateVersion[]>([]);
  const [changelog, setChangelog] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'versions' | 'changelog'>('versions');
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchVersionHistory();
    fetchChangelog();
  }, [estimateId]);

  const fetchVersionHistory = async () => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}/versions`);
      const data = await response.json();
      if (data.success) {
        setVersions(data.data);
      } else {
        setError(data.error || 'Failed to fetch version history');
      }
    } catch (err) {
      setError('Error fetching version history');
      console.error('Error:', err);
    }
  };

  const fetchChangelog = async () => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}/changelog`);
      const data = await response.json();
      if (data.success) {
        setChangelog(data.data);
      }
    } catch (err) {
      console.error('Error fetching changelog:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="text-green-600" size={16} />;
      case 'rejected': return <XCircle className="text-red-600" size={16} />;
      case 'pending': return <AlertCircle className="text-yellow-600" size={16} />;
      default: return null;
    }
  };

  const getRevisionTypeColor = (type?: string) => {
    switch (type) {
      case 'price_adjustment': return 'bg-blue-100 text-blue-800';
      case 'scope_change': return 'bg-purple-100 text-purple-800';
      case 'client_request': return 'bg-green-100 text-green-800';
      case 'correction': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleVersionExpansion = (versionId: number) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const getPriceChange = (currentVersion: EstimateVersion, previousVersion?: EstimateVersion) => {
    if (!previousVersion) return null;
    
    const change = currentVersion.total_amount - previousVersion.total_amount;
    const percentage = ((change / previousVersion.total_amount) * 100).toFixed(1);
    
    return {
      amount: change,
      percentage: parseFloat(percentage),
      isIncrease: change > 0
    };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading version history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch size={24} />
              <div>
                <h2 className="text-xl font-bold">Estimate Version History</h2>
                <p className="text-blue-100">Track all changes and revisions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 p-2 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'versions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Versions ({versions.length})
            </button>
            <button
              onClick={() => setActiveTab('changelog')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'changelog'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Change Log ({changelog.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-4">
              {versions.map((version, index) => {
                const previousVersion = versions[index - 1];
                const priceChange = getPriceChange(version, previousVersion);
                const isExpanded = expandedVersions.has(version.id);

                return (
                  <div
                    key={version.id}
                    className={`border rounded-lg overflow-hidden ${
                      version.is_current_version ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleVersionExpansion(version.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">v{version.revision_number}</span>
                              {version.is_current_version && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded">
                                  CURRENT
                                </span>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              {formatDate(version.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-lg">{formatCurrency(version.total_amount)}</div>
                            {priceChange && (
                              <div className={`text-sm ${
                                priceChange.isIncrease ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {priceChange.isIncrease ? '+' : ''}{formatCurrency(priceChange.amount)} 
                                ({priceChange.isIncrease ? '+' : ''}{priceChange.percentage}%)
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => onViewVersion(version.id)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </div>
                      </div>

                      {version.change_summary && (
                        <div className="mt-3 text-gray-700">
                          <strong>Summary:</strong> {version.change_summary}
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(version.status)}`}>
                          {version.status.toUpperCase()}
                        </span>
                        
                        {version.revision_type && (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getRevisionTypeColor(version.revision_type)}`}>
                            {version.revision_type.replace('_', ' ').toUpperCase()}
                          </span>
                        )}

                        {version.approval_status && (
                          <div className="flex items-center gap-1">
                            {getApprovalStatusIcon(version.approval_status)}
                            <span className="text-xs">
                              {version.approval_status} 
                              {version.approved_by && ` by ${version.approved_by}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Labor Cost:</span>
                            <div className="font-medium">{formatCurrency(version.labor_cost)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Material Cost:</span>
                            <div className="font-medium">{formatCurrency(version.material_cost)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Markup:</span>
                            <div className="font-medium">{version.markup_percentage}%</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'changelog' && (
            <div className="space-y-3">
              {changelog.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 text-xs font-semibold rounded ${
                        entry.change_type === 'created' ? 'bg-green-100 text-green-800' :
                        entry.change_type === 'updated' ? 'bg-blue-100 text-blue-800' :
                        entry.change_type === 'deleted' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.change_type.toUpperCase()}
                      </div>
                      <span className="font-medium">{entry.field_name.replace('_', ' ')}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(entry.changed_at)} by {entry.changed_by}
                    </div>
                  </div>
                  
                  {entry.old_value !== entry.new_value && (
                    <div className="mt-2 text-sm">
                      {entry.old_value && (
                        <div className="text-red-600">
                          <span className="font-medium">From:</span> {entry.old_value}
                        </div>
                      )}
                      <div className="text-green-600">
                        <span className="font-medium">To:</span> {entry.new_value}
                      </div>
                    </div>
                  )}

                  {entry.change_summary && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Note:</strong> {entry.change_summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstimateVersionHistory;