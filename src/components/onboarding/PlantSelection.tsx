import React, { useState } from 'react';
import { Plane as Plant } from 'lucide-react';

interface PlantCategory {
  name: string;
  plants: string[];
}

interface PlantSelectionProps {
  categories: Record<string, string[]>;
  selectedPlants: string[];
  onPlantSelect: (plant: string, action: 'add' | 'remove') => void;
  onNext: () => void;
  compatiblePlants: Array<{ name: string; recommended: boolean; reason?: string }>;
  companionSuggestions: string[];
  loadingPlants: boolean;
}

const PlantSelection: React.FC<PlantSelectionProps> = ({
  categories,
  selectedPlants,
  onPlantSelect,
  onNext,
  compatiblePlants,
  companionSuggestions,
  loadingPlants
}) => {
  const [activeCategory, setActiveCategory] = useState('Common Vegetables');

  if (loadingPlants) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 min-h-[200px]">
        <div className="text-center space-y-4">
          <div className="text-xl font-display text-forest-800">
            Finding Perfect Plants for Your Garden
          </div>
          <div className="h-6">
            <p className="text-forest-600 animate-fade-in">
              Analyzing your growing zone and garden size...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.keys(categories).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-full transition-all ${
              activeCategory === category
                ? 'bg-spring-leaf-500 text-white shadow-md'
                : 'bg-spring-leaf-50 text-forest-600 hover:bg-spring-leaf-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories[activeCategory]?.map((plant) => {
          const compatibility = compatiblePlants.find(p => p.name === plant);
          const isRecommended = compatibility?.recommended ?? true;
          
          return (
            <button
              key={plant}
              onClick={() => {
                if (isRecommended) {
                  onPlantSelect(plant, selectedPlants.includes(plant) ? 'remove' : 'add');
                }
              }}
              disabled={!isRecommended}
              className={`p-6 rounded-2xl backdrop-blur-sm transition-all border relative group ${
                selectedPlants.includes(plant)
                  ? 'bg-spring-leaf-500 border-spring-leaf-600 text-white shadow-lg shadow-spring-leaf-500/20'
                  : isRecommended
                    ? 'bg-white/80 border-spring-leaf-200 text-forest-600 hover:bg-spring-leaf-50'
                    : 'bg-white/50 border-spring-leaf-100 text-forest-400 cursor-not-allowed'
              }`}
            >
              <h3 className="text-lg font-medium">{plant}</h3>
              {!isRecommended && compatibility?.reason && (
                <div className="absolute inset-x-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-white px-4 py-2 rounded-xl shadow-lg text-sm text-forest-600 border border-spring-leaf-200 mx-4">
                    {compatibility.reason}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedPlants.length > 0 && (
        <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-spring-leaf-200">
          <h4 className="font-medium text-forest-600 mb-2">Selected Plants ({selectedPlants.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedPlants.map((plant) => (
              <span
                key={plant}
                className="px-3 py-1 bg-spring-leaf-500 rounded-full text-white text-sm shadow-sm"
              >
                {plant}
              </span>
            ))}
          </div>
        </div>
      )}

      {companionSuggestions.length > 0 && (
        <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-spring-leaf-200">
          <h4 className="font-medium text-forest-600 mb-4 text-lg">Recommended Companion Plants:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {companionSuggestions.map((plant) => (
              <button
                key={plant}
                onClick={() => onPlantSelect(plant, 'add')}
                className="p-3 text-base bg-spring-leaf-50 rounded-xl hover:bg-spring-leaf-100 transition-colors text-forest-600 border border-spring-leaf-200"
              >
                {plant}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onNext}
          disabled={selectedPlants.length === 0}
          className="px-8 py-4 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors text-lg font-medium shadow-lg shadow-spring-leaf-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedPlants.length >= 3 ? 'Next' : 'Get Recommendations'}
        </button>
      </div>
    </div>
  );
};

export default PlantSelection;