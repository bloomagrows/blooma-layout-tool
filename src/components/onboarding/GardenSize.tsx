import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Edit2 } from 'lucide-react';

interface GardenSize {
  name: string;
  width: number;
  height: number;
  description: string;
  isPro?: boolean;
}

interface GardenSizeProps {
  sizes: GardenSize[];
  onSelect: (dimensions: { width: number; height: number }) => void;
  onNext: () => void;
  selectedDimensions: { width: number; height: number } | null;
}

const MAX_SQUARE_FEET = 400;

const GardenSize: React.FC<GardenSizeProps> = ({ sizes, onSelect, onNext, selectedDimensions }) => {
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [showCustomInputs, setShowCustomInputs] = useState(false);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [sizeError, setSizeError] = useState<string | null>(null);

  const handleSizeSelection = (size: GardenSize) => {
    onSelect({ width: size.width, height: size.height });
    setUseCustomSize(false);
    setSizeError(null);
  };

  const handleCustomSizeSubmit = () => {
    const width = parseFloat(customWidth);
    const height = parseFloat(customHeight);
    
    if (width > 0 && height > 0) {
      const totalArea = width * height;
      
      if (totalArea > MAX_SQUARE_FEET) {
        setSizeError(`Garden size cannot exceed ${MAX_SQUARE_FEET} square feet. Your garden is ${totalArea} square feet.`);
        return;
      }

      onSelect({
        width: Math.round(width),
        height: Math.round(height)
      });
      setSizeError(null);
      setShowCustomInputs(false);
    }
  };

  const handleCustomInputChange = (value: string, setter: (value: string) => void) => {
    const numValue = parseFloat(value);
    if (value === '' || (!isNaN(numValue) && numValue >= 0)) {
      setter(value);
      setSizeError(null);
    }
  };

  const handleEditCustomSize = () => {
    setShowCustomInputs(true);
  };

  const handleToggleCustomSize = () => {
    setUseCustomSize(!useCustomSize);
    setShowCustomInputs(!useCustomSize);
    if (!useCustomSize) {
      setCustomWidth('');
      setCustomHeight('');
      setSizeError(null);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <p className="text-forest-600 text-center text-lg">
        Not sure of your exact dimensions? No problem! Select an approximate size or enter specific measurements.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sizes.map((size) => (
          <button
            key={size.name}
            onClick={() => handleSizeSelection(size)}
            className={`p-6 rounded-2xl backdrop-blur-sm transition-all border relative overflow-hidden group ${
              !useCustomSize && 
              selectedDimensions?.width === size.width && 
              selectedDimensions?.height === size.height
                ? 'bg-spring-leaf-500 border-spring-leaf-600 text-white shadow-lg shadow-spring-leaf-500/20'
                : 'bg-white/80 border-spring-leaf-200 text-forest-600 hover:bg-spring-leaf-50'
            }`}
          >
            {size.isPro && (
              <span className="absolute top-2 right-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-heirloom-500 to-heirloom-400 text-white border border-heirloom-400/30">
                PRO
              </span>
            )}
            <div className="relative z-10">
              <h3 className="text-2xl font-display mb-2">{size.name}</h3>
              <p className="text-forest-500 text-sm">{size.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12">
        <button
          onClick={handleToggleCustomSize}
          className="text-forest-600 hover:text-forest-800 transition-colors flex items-center gap-2 mx-auto"
        >
          {useCustomSize ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          <span>Know your exact dimensions?</span>
        </button>

        {useCustomSize && (
          <div className="mt-6 space-y-6">
            {!showCustomInputs && selectedDimensions && useCustomSize ? (
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-spring-leaf-50 border border-spring-leaf-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="text-forest-800">
                      Custom size set to <span className="font-medium">{selectedDimensions.width}' × {selectedDimensions.height}'</span>
                    </div>
                    <button
                      onClick={handleEditCustomSize}
                      className="p-2 text-forest-600 hover:text-forest-800 hover:bg-spring-leaf-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div>
                    <label className="block text-forest-600 text-sm mb-2">Length (feet)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={customWidth}
                      onChange={(e) => handleCustomInputChange(e.target.value, setCustomWidth)}
                      placeholder="Length in feet"
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-spring-leaf-200 rounded-xl text-forest-800 placeholder:text-forest-400 focus:ring-2 focus:ring-spring-leaf-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-forest-600 text-sm mb-2">Width (feet)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={customHeight}
                      onChange={(e) => handleCustomInputChange(e.target.value, setCustomHeight)}
                      placeholder="Width in feet"
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-spring-leaf-200 rounded-xl text-forest-800 placeholder:text-forest-400 focus:ring-2 focus:ring-spring-leaf-500/50"
                    />
                  </div>
                </div>

                {sizeError && (
                  <div className="max-w-md mx-auto p-3 bg-heirloom-50 border border-heirloom-200 rounded-xl text-heirloom-700 text-sm">
                    {sizeError}
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleCustomSizeSubmit}
                    className="px-6 py-3 bg-white text-forest-600 rounded-full hover:bg-spring-leaf-50 transition-colors border border-spring-leaf-200 font-medium"
                  >
                    Set Custom Size
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={onNext}
          disabled={!selectedDimensions}
          className="px-8 py-4 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors text-lg font-medium shadow-lg shadow-spring-leaf-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default GardenSize;