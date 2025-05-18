import React from 'react';
import { Plane as Plant, Sprout, Flower, Sun, Cloud, Crop as Drop, AlertCircle } from 'lucide-react';

const messages = [
  "Analyzing sunlight patterns...",
  "Calculating plant spacing...",
  "Considering companion planting...",
  "Planning water distribution...",
  "Optimizing for pollinators...",
  "Arranging tall plants northward...",
  "Mapping growth patterns...",
  "Creating garden harmony..."
];

interface LoadingGardenProps {
  isSafeToNavigate?: boolean;
  useAI?: boolean;
  error?: string | null;
  onCancel?: () => void;
}

const LoadingGarden: React.FC<LoadingGardenProps> = ({ 
  isSafeToNavigate, 
  useAI = true,
  error,
  onCancel 
}) => {
  const [messageIndex, setMessageIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-heirloom-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-heirloom-500" />
          </div>
          <div>
            <h2 className="text-xl font-display text-heirloom-600 mb-2">
              Garden Generation Failed
            </h2>
            <p className="text-forest-600">
              {error}
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors font-medium shadow-md shadow-spring-leaf-500/20"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center">
      <div className="relative w-48 h-48 mb-8">
        {/* Animated garden scene */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-32 h-32">
            {/* Sun */}
            <div className="absolute -top-8 right-0 animate-pulse">
              <Sun className="w-8 h-8 text-yellow-400" />
            </div>
            
            {/* Cloud */}
            <div className="absolute -top-4 -left-8 animate-bounce" style={{ animationDuration: '3s' }}>
              <Cloud className="w-8 h-8 text-sage-100/50" />
            </div>

            {/* Water drop */}
            <div className="absolute -right-4 top-8 animate-bounce" style={{ animationDuration: '1.5s' }}>
              <Drop className="w-6 h-6 text-blue-400/70" />
            </div>

            {/* Growing plants */}
            <div className="absolute bottom-0 left-0 animate-grow origin-bottom">
              <Sprout className="w-12 h-12 text-emerald-400" />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-grow origin-bottom" style={{ animationDelay: '0.5s' }}>
              <Sprout className="w-10 h-10 text-sage-300" />
            </div>
            <div className="absolute bottom-0 right-0 animate-grow origin-bottom" style={{ animationDelay: '1s' }}>
              <Flower className="w-8 h-8 text-pink-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <div className="text-xl font-display text-forest-800 mb-2">
          {useAI ? "AI is Designing Your Garden" : "Designing Your Garden"}
        </div>
        <div className="h-6">
          <p className="text-forest-600 animate-fade-in">
            {messages[messageIndex]}
          </p>
        </div>
      </div>

      {isSafeToNavigate && (
        <div className="mt-8 text-sm text-forest-600 bg-spring-leaf-50 border border-spring-leaf-200 rounded-xl p-4 max-w-md mx-auto">
          <p className="mb-4">
            Your garden layout is being generated in the background. You can safely navigate away from this page - your layout will be ready when you return.
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-forest-800 hover:text-forest-600 transition-colors underline"
            >
              Cancel Generation
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LoadingGarden;