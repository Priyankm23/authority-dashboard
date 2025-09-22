import React, { useState } from 'react';
import { 
  FileText, 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  Save, 
  Download, 
  Send,
  AlertTriangle,
  Clock,
  Users
} from 'lucide-react';
import { mockTourists } from '../utils/mockData';

interface FIRData {
  touristId: string;
  touristName: string;
  govIdHash: string;
  country: string;
  phoneNumber: string;
  emergencyContact: string;
  lastKnownLocation: string;
  lastSeenDate: string;
  lastSeenTime: string;
  incidentType: string;
  incidentDescription: string;
  reportingOfficer: string;
  reportingUnit: string;
  reportDate: string;
  reportTime: string;
  witnesses: string;
  additionalInfo: string;
}

const FIRGenerator: React.FC = () => {
  const [selectedTourist, setSelectedTourist] = useState<string>('');
  const [firData, setFirData] = useState<FIRData>({
    touristId: '',
    touristName: '',
    govIdHash: '',
    country: '',
    phoneNumber: '',
    emergencyContact: '',
    lastKnownLocation: '',
    lastSeenDate: '',
    lastSeenTime: '',
    incidentType: 'missing',
    incidentDescription: '',
    reportingOfficer: '',
    reportingUnit: '',
    reportDate: new Date().toISOString().split('T')[0],
    reportTime: new Date().toTimeString().slice(0, 5),
    witnesses: '',
    additionalInfo: ''
  });

  const incidentTypes = [
    { value: 'missing', label: 'Missing Person' },
    { value: 'theft', label: 'Theft/Robbery' },
    { value: 'assault', label: 'Physical Assault' },
    { value: 'fraud', label: 'Fraud/Scam' },
    { value: 'accident', label: 'Accident' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'other', label: 'Other' }
  ];

  const handleTouristSelect = (touristId: string) => {
    const tourist = mockTourists.find(t => t.id === touristId);
    if (tourist) {
      setSelectedTourist(touristId);
      setFirData({
        ...firData,
        touristId: tourist.id,
        touristName: tourist.name,
        govIdHash: tourist.govIdHash,
        country: tourist.country,
        phoneNumber: tourist.phoneNumber,
        emergencyContact: tourist.emergencyContact,
        lastKnownLocation: tourist.lastKnownLocation.address,
        lastSeenDate: new Date(tourist.lastKnownLocation.timestamp).toISOString().split('T')[0],
        lastSeenTime: new Date(tourist.lastKnownLocation.timestamp).toTimeString().slice(0, 5)
      });
    }
  };

  const handleInputChange = (field: keyof FIRData, value: string) => {
    setFirData({ ...firData, [field]: value });
  };

  const generateFIRNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FIR/${year}/${random}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firNumber = generateFIRNumber();
    alert(`E-FIR ${firNumber} has been generated and submitted successfully!`);
    // Reset form
    setFirData({
      touristId: '',
      touristName: '',
      govIdHash: '',
      country: '',
      phoneNumber: '',
      emergencyContact: '',
      lastKnownLocation: '',
      lastSeenDate: '',
      lastSeenTime: '',
      incidentType: 'missing',
      incidentDescription: '',
      reportingOfficer: '',
      reportingUnit: '',
      reportDate: new Date().toISOString().split('T')[0],
      reportTime: new Date().toTimeString().slice(0, 5),
      witnesses: '',
      additionalInfo: ''
    });
    setSelectedTourist('');
  };

  const exportAsPDF = () => {
    alert('FIR will be exported as PDF. This feature would generate a formatted PDF document.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-FIR Generator</h1>
          <p className="text-gray-600 mt-2">Generate electronic First Information Reports for tourist incidents</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <div className="text-sm text-gray-600">
            <span className="font-medium">FIR Number will be auto-generated</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">FIRs This Month</p>
              <p className="text-2xl font-bold text-blue-600">23</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Missing Person Cases</p>
              <p className="text-2xl font-bold text-red-600">8</p>
            </div>
            <Users className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cases Resolved</p>
              <p className="text-2xl font-bold text-green-600">19</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* FIR Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <span>Electronic First Information Report (E-FIR)</span>
          </h2>
          <p className="text-sm text-gray-600 mt-2">All fields marked with * are mandatory</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Tourist Selection */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-600" />
              <span>Tourist Information</span>
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tourist from Registry *
                </label>
                <select
                  value={selectedTourist}
                  onChange={(e) => handleTouristSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a tourist...</option>
                  {mockTourists.map(tourist => (
                    <option key={tourist.id} value={tourist.id}>
                      {tourist.name} ({tourist.id}) - {tourist.country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tourist Name *
                </label>
                <input
                  type="text"
                  value={firData.touristName}
                  onChange={(e) => handleInputChange('touristName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter tourist name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tourist ID *
                </label>
                <input
                  type="text"
                  value={firData.touristId}
                  onChange={(e) => handleInputChange('touristId', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tourist ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country of Origin *
                </label>
                <input
                  type="text"
                  value={firData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Country"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={firData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Phone number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact *
                </label>
                <input
                  type="tel"
                  value={firData.emergencyContact}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Emergency contact number"
                  required
                />
              </div>
            </div>
          </div>

          {/* Incident Information */}
          <div className="bg-red-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Incident Details</span>
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Type *
                </label>
                <select
                  value={firData.incidentType}
                  onChange={(e) => handleInputChange('incidentType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {incidentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Description *
                </label>
                <textarea
                  value={firData.incidentDescription}
                  onChange={(e) => handleInputChange('incidentDescription', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Detailed description of the incident..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Last Known Information */}
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-yellow-600" />
              <span>Last Known Information</span>
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Known Location *
                </label>
                <input
                  type="text"
                  value={firData.lastKnownLocation}
                  onChange={(e) => handleInputChange('lastKnownLocation', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Last known location address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Seen Date *
                </label>
                <input
                  type="date"
                  value={firData.lastSeenDate}
                  onChange={(e) => handleInputChange('lastSeenDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Seen Time *
                </label>
                <input
                  type="time"
                  value={firData.lastSeenTime}
                  onChange={(e) => handleInputChange('lastSeenTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reporting Information */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Reporting Officer Information</span>
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reporting Officer Name *
                </label>
                <input
                  type="text"
                  value={firData.reportingOfficer}
                  onChange={(e) => handleInputChange('reportingOfficer', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Officer name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reporting Unit/Station *
                </label>
                <input
                  type="text"
                  value={firData.reportingUnit}
                  onChange={(e) => handleInputChange('reportingUnit', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Unit or station name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Date *
                </label>
                <input
                  type="date"
                  value={firData.reportDate}
                  onChange={(e) => handleInputChange('reportDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Time *
                </label>
                <input
                  type="time"
                  value={firData.reportTime}
                  onChange={(e) => handleInputChange('reportTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Witnesses (if any)
                </label>
                <textarea
                  value={firData.witnesses}
                  onChange={(e) => handleInputChange('witnesses', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Names and contact details of witnesses..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information
                </label>
                <textarea
                  value={firData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any other relevant information..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Send className="h-5 w-5" />
              <span>Submit E-FIR</span>
            </button>
            <button
              type="button"
              onClick={exportAsPDF}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Download className="h-5 w-5" />
              <span>Export as PDF</span>
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Save className="h-5 w-5" />
              <span>Save Draft</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FIRGenerator;