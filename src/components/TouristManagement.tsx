import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Phone,
  Calendar
} from 'lucide-react';
import { mockTourists } from '../utils/mockData';
import { Tourist } from '../types';

const TouristManagement: React.FC = () => {
  const [tourists, setTourists] = useState<Tourist[]>(mockTourists);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [selectedTourist, setSelectedTourist] = useState<Tourist | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'revoked': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'expired': return Clock;
      case 'revoked': return XCircle;
      default: return Clock;
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const filteredTourists = tourists.filter(tourist => {
    const matchesSearch = tourist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tourist.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tourist.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tourist.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const verifyOnBlockchain = (touristId: string) => {
    // Simulate blockchain verification
    alert(`Verifying ${touristId} on blockchain... ✓ Verified`);
  };

  const extendValidity = (touristId: string) => {
    const newDate = new Date();
    newDate.setMonth(newDate.getMonth() + 1);
    setTourists(tourists.map(t => 
      t.id === touristId 
        ? { ...t, tripValidTo: newDate.toISOString().split('T')[0], status: 'active' as const }
        : t
    ));
  };

  const revokeId = (touristId: string) => {
    setTourists(tourists.map(t => 
      t.id === touristId 
        ? { ...t, status: 'revoked' as const }
        : t
    ));
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
                placeholder="Search by name, ID, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tourists</p>
              <p className="text-2xl font-bold text-gray-900">{tourists.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active IDs</p>
              <p className="text-2xl font-bold text-green-600">{tourists.filter(t => t.status === 'active').length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired IDs</p>
              <p className="text-2xl font-bold text-red-600">{tourists.filter(t => t.status === 'expired').length}</p>
            </div>
            <Clock className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Safety Score</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(tourists.reduce((acc, t) => acc + t.safetyScore, 0) / tourists.length)}
              </p>
            </div>
            <Shield className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Tourists Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Tourist Registry</h2>
        </div>
        <div className="overflow-x-auto">
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
              {filteredTourists.map((tourist) => {
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
                            <span>{tourist.phoneNumber}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tourist.id}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {tourist.govIdHash.substring(0, 20)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{tourist.tripValidFrom}</span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-1">
                        <span>to {tourist.tripValidTo}</span>
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
                          onClick={() => verifyOnBlockchain(tourist.id)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-lg transition-colors"
                          title="Verify on Blockchain"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedTourist(tourist)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {tourist.status === 'expired' && (
                          <button
                            onClick={() => extendValidity(tourist.id)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg transition-colors"
                            title="Extend Validity"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {tourist.status === 'active' && (
                          <button
                            onClick={() => revokeId(tourist.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-colors"
                            title="Revoke ID"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
                    <p><strong>Tourist ID:</strong> {selectedTourist.id}</p>
                    <p><strong>Country:</strong> {selectedTourist.country}</p>
                    <p><strong>Phone:</strong> {selectedTourist.phoneNumber}</p>
                    <p><strong>Emergency Contact:</strong> {selectedTourist.emergencyContact}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Travel Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Valid From:</strong> {selectedTourist.tripValidFrom}</p>
                    <p><strong>Valid To:</strong> {selectedTourist.tripValidTo}</p>
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
                <h3 className="font-semibold text-gray-900 mb-3">Last Known Location</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <p><strong>Address:</strong> {selectedTourist.lastKnownLocation.address}</p>
                  <p><strong>Coordinates:</strong> {selectedTourist.lastKnownLocation.lat}, {selectedTourist.lastKnownLocation.lng}</p>
                  <p><strong>Timestamp:</strong> {new Date(selectedTourist.lastKnownLocation.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Travel Itinerary</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {selectedTourist.travelItinerary.map((location, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {location}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Blockchain Verification</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700 mb-2">
                    <strong>Government ID Hash:</strong>
                  </p>
                  <p className="font-mono text-xs text-green-600 break-all">
                    {selectedTourist.govIdHash}
                  </p>
                  <button
                    onClick={() => verifyOnBlockchain(selectedTourist.id)}
                    className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Verify on Blockchain
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredTourists.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tourists found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No tourists registered in the system.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TouristManagement;