import React from 'react';
import { SOSAlert } from '../types';
import { User, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { formatTimeAgo, formatSOSReason, getSeverityFromScore, formatPhoneNumber } from '../utils/formatters';

interface AuthorityAlertCardProps {
  alert: SOSAlert;
  onRespond: (alert: SOSAlert) => void;
  onViewDetails: (alert: SOSAlert) => void;
  isHighlighted?: boolean;
}

export const AuthorityAlertCard: React.FC<AuthorityAlertCardProps> = ({
  alert,
  onRespond,
  onViewDetails,
  isHighlighted = false,
}) => {
  const severity = alert.severity || getSeverityFromScore(alert.safetyScore || 50);
  const reason = formatSOSReason(alert.sosReason);
  const locationName = alert.locationName || alert.location?.locationName || alert.location?.address || 'Unknown Location';
  
  // Severity colors for left border - matching new palette
  const borderColors = {
    critical: 'border-l-red-900',
    high: 'border-l-red-600',
    medium: 'border-l-orange-500',
    low: 'border-l-yellow-500',
  };
  
  
  // Severity badge colors - matching new palette
  const badgeColors = {
    critical: 'bg-red-900 text-white',
    high: 'bg-red-600 text-white',
    medium: 'bg-orange-500 text-white',
    low: 'bg-yellow-500 text-black',
  };
  
  // Highlight styles - dynamic based on severity
  // Use animate-pulse for strong flicker
  const highlightStyles = isHighlighted 
    ? `ring-2 ring-offset-2 animate-pulse ${
        severity === 'critical' ? 'ring-red-600 bg-red-50' :
        severity === 'high' ? 'ring-red-500 bg-red-50' :
        severity === 'medium' ? 'ring-orange-500 bg-orange-50' :
        'ring-yellow-500 bg-yellow-50'
      }`
    : 'hover:shadow-lg bg-white';

  return (
    <div 
      onClick={() => onViewDetails(alert)}
      className={`${highlightStyles} rounded-lg shadow-md transition-all duration-300 border-l-4 ${borderColors[severity]} overflow-hidden cursor-pointer`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onViewDetails(alert);
        }
      }}
    >
      <div className="p-4">
        {/* Header with Title and Severity Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-5 h-5 ${isHighlighted ? 'animate-bounce' : ''} ${
     severity === 'critical' ? 'text-red-900' :
     severity === 'high' ? 'text-red-600' :
     severity === 'medium' ? 'text-orange-500' :
     'text-yellow-600' // slightly darker for text legibility
   }`} />
              <h3 className="text-lg font-bold text-gray-900">{reason}</h3>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>Alert ID: #{alert.alertId || alert.id}</div>
              <div>Source: Mobile App Panic Button</div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${badgeColors[severity]}`}>
            {severity}
          </span>
        </div>

        {/* Victim Information */}
        <div className={`grid grid-cols-2 gap-4 mb-3 pb-3 border-b ${
            isHighlighted 
                ? (severity === 'critical' ? 'border-red-200' : 
                   severity === 'high' ? 'border-red-200' : 
                   severity === 'medium' ? 'border-orange-200' : 
                   'border-yellow-200') 
                : 'border-gray-200'
        }`}>
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-900">
                {alert.touristName}
              </div>
              <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-3">
                <span>{alert.age ? `${alert.age} Yrs` : 'Age N/A'}</span>
                <span className="text-gray-300">•</span>
                <span>{alert.gender || 'Gender N/A'}</span>
                <span className="text-gray-300">•</span>
                <span>{alert.nationality || 'Nationality N/A'}</span>
                {alert.phone && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="font-medium text-gray-700">{formatPhoneNumber(alert.phone)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-900">{locationName}</div>
              <div className="text-xs text-gray-600">
                {alert.location?.address || 'Location details unavailable'}
              </div>
            </div>
          </div>
        </div>

        {/* Time and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{formatTimeAgo(alert.timestamp)}</span>
            {isHighlighted && (
                <span className={`ml-2 font-bold text-xs uppercase tracking-wider ${
                    severity === 'critical' ? 'text-red-900' :
                    severity === 'high' ? 'text-red-600' :
                    severity === 'medium' ? 'text-orange-600' :
                    'text-yellow-600'
                }`}>(Just Now)</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            
            {(alert.status === 'assigned' || alert.status === 'responding') && (
              <div className="text-right mr-2">
                <div className="text-xs font-bold text-gray-900">
                  Assigned to: {typeof alert.assignedUnit === 'object' ? (alert.assignedUnit as any).fullName || (alert.assignedUnit as any).authorityId : alert.assignedUnit || (Array.isArray(alert.assignedTo) && alert.assignedTo[0] ? (typeof alert.assignedTo[0] === 'object' ? (alert.assignedTo[0] as any).fullName : alert.assignedTo[0]) : 'Unit')}
                </div>
                <div className="text-xs text-gray-500">
                  {alert.responseDate ? new Date(alert.responseDate).toLocaleTimeString() : 'Just now'}
                </div>
              </div>
            )}
            
            {(!['assigned', 'responding', 'resolved'].includes(alert.status)) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRespond(alert);
                }}
                className={`px-4 py-1.5 rounded text-sm font-bold text-white transition-colors shadow-sm ${
                  severity === 'critical' || severity === 'high'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                RESPOND
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
