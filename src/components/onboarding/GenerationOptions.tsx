import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import EmailNotification from './EmailNotification';
import { safeStorage } from '../../utils/supabase';
import type { Plant } from '../../types';

interface GenerationOptionsProps {
  onComplete: (email?: string) => void;
  gardenSize: { width: number; height: number };
  selectedPlants: Plant[];
  growingZone: number;
}

const GenerationOptions: React.FC<GenerationOptionsProps> = ({ 
  onComplete, 
  gardenSize,
  selectedPlants,
  growingZone
}) => {
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMethodSelect = (useAI: boolean) => {
    try {
      safeStorage.setItem('useAI', useAI.toString());
      
      if (useAI) {
        setShowEmailPrompt(true);
      } else {
        onComplete();
      }
    } catch (error) {
      console.error('Error storing AI preference:', error);
      // Continue anyway since this is not critical
      if (useAI) {
        setShowEmailPrompt(true);
      } else {
        onComplete();
      }
    }
  };

  const handleEmailSubmit = (email: string | null) => {
    setShowEmailPrompt(false);
    
    try {
      // Store the AI preference
      safeStorage.setItem('useAI', 'true');
    } catch (error) {
      console.error('Error storing AI preference:', error);
      // Not critical, continue with generation
    }
    
    // Always call onComplete to trigger the layout generation
    onComplete(email || undefined);
  };

  return (
    <div className="text-center space-y-8 max-w-md mx-auto">
      <p className="text-forest-600 text-lg">
        Based on your selections, we'll generate a personalized garden layout and suggest companion plants that work well together.
      </p>

      {error && (
        <div className="p-4 bg-heirloom-50 border border-heirloom-200 rounded-xl text-heirloom-700">
          {error}
        </div>
      )}

      <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-spring-leaf-200">
        <h3 className="text-lg font-medium text-forest-800 mb-4 flex items-center justify-center gap-2">
          <Settings className="w-5 h-5" />
          <span>Layout Generation Method</span>
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => handleMethodSelect(true)}
            className="p-4 text-left rounded-xl border-2 border-spring-leaf-200 hover:border-spring-leaf-500 transition-colors relative group"
          >
            <div className="absolute inset-y-0 right-4 flex items-center">
              <div className="w-4 h-4 rounded-full border-2 border-spring-leaf-200 group-hover:border-spring-leaf-500">
                <div className={`w-2 h-2 rounded-full bg-spring-leaf-500 m-0.5 ${
                  safeStorage.getItem('useAI') !== 'false' ? 'opacity-100' : 'opacity-0'
                }`} />
              </div>
            </div>
            <h4 className="font-medium text-forest-800 mb-1 flex items-center gap-2">
              AI-Powered Layout
              <span className="text-spring-leaf-500">(Recommended)</span>
            </h4>
            <p className="text-sm text-forest-600">
              Uses advanced AI to create an optimized layout considering plant spacing, sunlight, and companion planting.
            </p>
          </button>

          <button
            onClick={() => handleMethodSelect(false)}
            className="p-4 text-left rounded-xl border-2 border-spring-leaf-200 hover:border-spring-leaf-500 transition-colors relative group"
          >
            <div className="absolute inset-y-0 right-4 flex items-center">
              <div className="w-4 h-4 rounded-full border-2 border-spring-leaf-200 group-hover:border-spring-leaf-500">
                <div className={`w-2 h-2 rounded-full bg-spring-leaf-500 m-0.5 ${
                  safeStorage.getItem('useAI') === 'false' ? 'opacity-100' : 'opacity-0'
                }`} />
              </div>
            </div>
            <h4 className="font-medium text-forest-800 mb-1">Built-in Garden Planner</h4>
            <p className="text-sm text-forest-600">
              Uses our standard garden planning algorithm for quick and reliable layouts.
            </p>
          </button>
        </div>
      </div>

      {showEmailPrompt && (
        <EmailNotification
          onSubmit={handleEmailSubmit}
          onClose={() => setShowEmailPrompt(false)}
        />
      )}
    </div>
  );
};

export default GenerationOptions;