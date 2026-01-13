import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  Eye, 
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Phone,
  Calendar,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { fetchTouristManagementData, revokeTourist, TouristManagementData, TouristRegistryItem } from '../api/touristRegistry';

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const TouristManagement: React.FC = () => {
  const [data, setData] = useState<TouristManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [selectedTourist, setSelectedTourist] = useState<TouristRegistryItem | null>(null);

  // Revoke state
  const [touristToRevoke, setTouristToRevoke] = useState<TouristRegistryItem | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const loadData = async () => {
    setLoading(true);
    try {
       const statusParam = statusFilter === 'all' ? undefined : statusFilter;
       const result = await fetchTouristManagementData(statusParam, debouncedSearch);
       setData(result);
    } catch (error) {
      console.error('Failed to load tourist management data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [debouncedSearch, statusFilter]);

  const handleRevoke = async () => {
    if (!touristToRevoke) return;
    if (deleteConfirmation !== touristToRevoke.touristId) {
      setRevokeError(`Please type "${touristToRevoke.touristId}" to confirm.`);
      return;
    }
    
    setIsRevoking(true);
    setRevokeError(null);
    try {
      await revokeTourist(touristToRevoke.id, revokeReason);
      // Close modal and refresh data
      setTouristToRevoke(null);
      setRevokeReason('');
      setDeleteConfirmation('');
      loadData();
    } catch (err: any) {
      setRevokeError(err.message);
    } finally {
      setIsRevoking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return CheckCircle;
      case 'expired': return Clock;
      default: return Clock;
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const short = (s?: string) => {
    if (!s) return 'N/A';
    if (s.length > 20) return s.slice(0, 17) + '...';
    return s;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tourist Digital ID Management</h1>
          <p className="text-gray-600 mt-2">Manage and verify tourist digital identities and travel documents</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 pl-1">Server-side search by Tourist ID</p>
          </div>
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tourists</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalTourists}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active IDs</p>
                <p className="text-2xl font-bold text-green-600">{data.activeIDs}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expired IDs</p>
                <p className="text-2xl font-bold text-red-600">{data.expiredIDs}</p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Safety Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.averageSafetyScore}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tourists Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Tourist Registry</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-8 text-center text-gray-500">Loading registry...</div>
          ) : !data || data.registry.length === 0 ? (
             <div className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tourists found</h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria.
                </p>
             </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tourist Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Digital ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Validity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.registry.map((tourist: TouristRegistryItem) => {
                const StatusIcon = getStatusIcon(tourist.status);
                return (
                  <tr key={tourist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{tourist.name}</div>
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <Globe className="h-3 w-3" />
                            <span>{tourist.country}</span>
                            <Phone className="h-3 w-3 ml-2" />
                            <span>{tourist.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{short(tourist.touristId)}</div>
                      <div className="text-xs text-gray-500 font-mono" title={tourist.regTxHash}>
                        TX: {short(tourist.regTxHash)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{new Date(tourist.tripStart).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-1">
                         {tourist.tripEnd ? `to ${new Date(tourist.tripEnd).toLocaleDateString()}` : 'Indefinite'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSafetyScoreColor(tourist.safetyScore)}`}>
                        {tourist.safetyScore}/100
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tourist.status)}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {tourist.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedTourist(tourist)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                             setTouristToRevoke(tourist);
                             setDeleteConfirmation('');
                             setRevokeReason('');
                             setRevokeError(null);
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors border border-red-200"
                          title="Revoke and Delete ID"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      {touristToRevoke && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Revoke Tourist ID</h3>
            <p className="text-center text-gray-500 text-sm mb-6">
              This action will permanently delete the tourist record for <strong>{touristToRevoke.name}</strong> ({touristToRevoke.touristId}).
              This cannot be undone.
            </p>

            {revokeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-center text-red-600">
                {revokeError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for revocation <span className="text-red-500">*</span>
                </label>
                <select 
                   className="w-full border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500"
                   value={revokeReason}
                   onChange={(e) => setRevokeReason(e.target.value)}
                >
                  <option value="">Select a reason...</option>
                  <option value="Convicted of local laws violation / Misbehavior">Convicted / Misbehavior</option>
                  <option value="Status Expired / Trip Completed">Status Expired / Trip Completed</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Backend validates keywords: 'misbehave', 'convicted', 'expired', 'complete'</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To confirm, type "{touristToRevoke.touristId}"
                </label>
                <input
                  type="text"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={touristToRevoke.touristId}
                  onPaste={(e) => e.preventDefault()} // Force typing for safety
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setTouristToRevoke(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={isRevoking}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={isRevoking || !revokeReason || deleteConfirmation !== touristToRevoke.touristId}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex justify-center items-center"
                >
                  {isRevoking ? (
                     <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  ) : <Trash2 className="w-4 h-4 mr-2" />}
                  Revoke ID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tourist Detail Modal */}
      {selectedTourist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Tourist Details</h2>
                <button
                  onClick={() => setSelectedTourist(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedTourist.name}</p>
                    <p><strong>Tourist ID:</strong> {selectedTourist.touristId}</p>
                    <p><strong>Country:</strong> {selectedTourist.country}</p>
                    <p><strong>Phone:</strong> {selectedTourist.phone}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Travel Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Valid From:</strong> {new Date(selectedTourist.tripStart).toLocaleDateString()}</p>
                    <p><strong>Valid To:</strong> {selectedTourist.tripEnd ? new Date(selectedTourist.tripEnd).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedTourist.status)}`}>
                        {selectedTourist.status.toUpperCase()}
                      </span>
                    </p>
                    <p><strong>Safety Score:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getSafetyScoreColor(selectedTourist.safetyScore)}`}>
                        {selectedTourist.safetyScore}/100
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Blockchain Verification</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700 mb-2">
                    <strong>Registration TX Hash:</strong>
                  </p>
                  <p className="font-mono text-xs text-green-600 break-all">
                    {selectedTourist.regTxHash}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TouristManagement;
