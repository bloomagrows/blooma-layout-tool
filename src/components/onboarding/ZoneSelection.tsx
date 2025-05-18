import React, { useState } from 'react';
import { Map } from 'lucide-react';

interface ZoneSelectionProps {
  onZoneSelect: (zone: number) => void;
  onNext: () => void;
  loading: boolean;
  error: string | null;
  showSuccess: boolean;
  selectedZone: number;
}

const ZoneSelection: React.FC<ZoneSelectionProps> = ({
  onZoneSelect,
  onNext,
  loading,
  error,
  showSuccess,
  selectedZone
}) => {
  const [zipCode, setZipCode] = useState('');

  const handleSubmit = () => {
    if (!zipCode || loading) return;
    onZoneSelect(zipCode);
  };

  return (
    <div className="space-y-8 max-w-md mx-auto">
      <div className="relative">
        <input
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-6 py-4 bg-white/80 backdrop-blur-sm border border-spring-leaf-200 rounded-full text-lg focus:ring-2 focus:ring-spring-leaf-500/50 placeholder:text-forest-400 text-forest-800"
          placeholder="Enter your zip code"
          disabled={loading}
        />
      </div>
      
      {showSuccess && (
        <div className="text-center animate-fade-in">
          <p className="text-forest-600 text-lg">
            You're in Zone {selectedZone}! We'll remember this to help you choose the right plants.
          </p>
        </div>
      )}
      
      {error && (
        <div className="text-center text-heirloom-600 animate-fade-in">
          {error}
        </div>
      )}
      
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!zipCode || loading}
          className="px-8 py-4 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors text-lg font-medium shadow-lg shadow-spring-leaf-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white mr-3" />
              Checking...
            </span>
          ) : (
            'Next'
          )}
        </button>
      </div>
    </div>
  );
};

export default ZoneSelection;