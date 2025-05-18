import React, { useState, useEffect } from 'react';
import { Map, Ruler, Plane as PlantIcon, Sun, Sprout } from 'lucide-react';
import { generateCompanionPlants, getGrowingZone, getZoneCompatiblePlants, optimizeGardenLayout } from '../utils/openai';
import { getLocalCompanionPlants, plantCategories, plantSpacing, plantHeights, sunRequirements } from '../utils/gardenData';
import { createOnboardingSession, updateOnboardingSession, generateSessionId, safeStorage } from '../utils/supabase';
import WelcomeStep from './onboarding/WelcomeStep';
import ZoneSelection from './onboarding/ZoneSelection';
import GardenSize from './onboarding/GardenSize';
import PlantSelection from './onboarding/PlantSelection';
import GenerationOptions from './onboarding/GenerationOptions';
import LoadingGarden from './LoadingGarden';
import type { GardenHistory, Plant } from '../types';

interface OnboardingProps {
  onComplete: (plants: string[], dimensions: { width: number; height: number }, sessionId: string, existingLayout?: GardenHistory) => void;
  onZoneChange: (zone: number) => void;
  initialZone?: number;
  skipZoneSelection?: boolean;
}

const gardenSizes = [
  {
    name: 'Small',
    width: 4,
    height: 4,
    description: 'Up to 25 sq ft (4\' × 4\')',
  },
  {
    name: 'Medium',
    width: 4,
    height: 8,
    description: '25–50 sq ft (4\' × 8\')',
  },
  {
    name: 'Large',
    width: 4,
    height: 16,
    description: '64+ sq ft (4\' × 16\')',
    isPro: true,
  },
];

const Onboarding: React.FC<OnboardingProps> = ({ 
  onComplete, 
  onZoneChange, 
  initialZone, 
  skipZoneSelection 
}) => {
  const [sessionId] = useState(() => {
    const existingId = safeStorage.getItem('onboarding_session_id');
    if (existingId) return existingId;
    
    const newId = generateSessionId();
    safeStorage.setItem('onboarding_session_id', newId);
    
    createOnboardingSession({
      session_id: newId,
      status: 'in_progress'
    });
    
    return newId;
  });

  // UI state
  const [step, setStep] = useState(skipZoneSelection ? 2 : 0);
  const [loading, setLoading] = useState(false);
  const [showZoneMessage, setShowZoneMessage] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Form state
  const [zipCode, setZipCode] = useState('');
  const [growingZone, setGrowingZone] = useState<number>(initialZone || 0);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [companionSuggestions, setCompanionSuggestions] = useState<string[]>([]);
  const [gardenDimensions, setGardenDimensions] = useState<{ width: number; height: number } | null>(null);
  const [compatiblePlants, setCompatiblePlants] = useState<Array<{ name: string; recommended: boolean; reason?: string }>>([]);
  const [loadingPlants, setLoadingPlants] = useState(false);

  // Convert selected plant names to Plant objects with proper data
  const selectedPlantObjects: Plant[] = selectedPlants.map(name => ({
    id: `plant-${name}`,
    name,
    scientificName: 'Placeholder',
    description: '',
    companionPlants: [],
    growingZones: [],
    spacing: plantSpacing[name] || 12,
    height: plantHeights[name] || 24,
    sunRequirement: sunRequirements[name] || 'full',
    wateringNeeds: 'moderate',
    seasonality: ['spring', 'summer'],
    daysToMaturity: 60
  }));

  const handleZoneSelection = async (zipCode: string) => {
    if (!zipCode || loading) return;
    
    setLoading(true);
    setZoneError(null);
    
    try {
      const detectedZone = await getGrowingZone(zipCode);
      
      if (detectedZone > 0) {
        setGrowingZone(detectedZone);
        onZoneChange(detectedZone);
        setShowZoneMessage(true);
        
        setTimeout(() => {
          setShowZoneMessage(false);
          setStep(2);
        }, 2000);
      } else {
        setZoneError('Unable to determine your growing zone. Please try again.');
      }
    } catch (error) {
      console.error('Error getting growing zone:', error);
      setZoneError('Unable to determine your growing zone. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSizeSelection = (dimensions: { width: number; height: number }) => {
    setGardenDimensions(dimensions);
  };

  const handlePlantSelection = (plant: string, action: 'add' | 'remove') => {
    setSelectedPlants(prev => 
      action === 'add'
        ? [...prev, plant]
        : prev.filter(p => p !== plant)
    );
  };

  const handleComplete = async (email?: string) => {
    if (!gardenDimensions || selectedPlants.length === 0) {
      return;
    }

    try {
      // Convert plant names to Plant objects
      const plantObjects: Plant[] = selectedPlants
        .filter(name => 
          plantSpacing[name] && 
          plantHeights[name] && 
          sunRequirements[name]
        )
        .map(name => ({
          id: `plant-${name}`,
          name,
          scientificName: 'Placeholder',
          description: '',
          companionPlants: [],
          growingZones: [],
          spacing: plantSpacing[name],
          height: plantHeights[name],
          sunRequirement: sunRequirements[name],
          wateringNeeds: 'moderate',
          seasonality: ['spring', 'summer'],
          daysToMaturity: 60
        }));

      // Update session with email if provided
      if (email) {
        await updateOnboardingSession(sessionId, {
          notification_email: email,
          status: 'completed'
        });
      }

      setIsGenerating(true);
      setGenerationError(null);

      // Start garden generation
      const generationId = await optimizeGardenLayout(
        plantObjects,
        gardenDimensions.width,
        gardenDimensions.height,
        growingZone,
        sessionId
      );

      // Store the generation ID
      safeStorage.setItem('current_layout_id', generationId);

      // Handle navigation in WebContainer environment
      if (window.location.hostname === 'webcontainer.io') {
        // Update the URL without triggering a page reload
        window.history.pushState({}, '', `/g?id=${generationId}`);
        // Force a page reload to ensure proper state reset
        window.location.reload();
      } else {
        // Normal browser navigation
        window.location.href = `/g?id=${generationId}`;
      }
    } catch (error) {
      console.error('Error starting garden generation:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to start garden generation');
      setIsGenerating(false);
    }
  };

  const handleLayoutSelect = (layout: GardenHistory) => {
    onComplete(
      selectedPlants, 
      { width: layout.layout_data.width, height: layout.layout_data.height }, 
      sessionId,
      layout
    );
  };

  // Show loading garden screen while generating
  if (isGenerating) {
    return (
      <LoadingGarden 
        useAI={true} 
        error={generationError}
        onCancel={() => {
          setIsGenerating(false);
          setGenerationError(null);
        }}
      />
    );
  }

  const steps = [
    {
      title: "Welcome to Blooma",
      description: "Let's create your perfect garden together",
      icon: <Sprout className="w-12 h-12 text-spring-leaf-500" />,
      content: (
        <WelcomeStep
          onNext={() => setStep(1)}
          onSelectLayout={handleLayoutSelect}
          sessionId={sessionId}
        />
      )
    },
    {
      title: "Find Your Growing Zone",
      description: "This helps us recommend the best plants for your area",
      icon: <Map className="w-20 h-20 text-spring-leaf-500" />,
      content: (
        <ZoneSelection
          onZoneSelect={handleZoneSelection}
          onNext={() => setStep(2)}
          loading={loading}
          error={zoneError}
          showSuccess={showZoneMessage}
          selectedZone={growingZone}
        />
      )
    },
    {
      title: "How big is your garden?",
      description: "We'll use this information to design a layout that fits your space",
      icon: <Ruler className="w-20 h-20 text-spring-leaf-500" />,
      content: (
        <GardenSize
          sizes={gardenSizes}
          onSelect={handleSizeSelection}
          onNext={() => {
            if (gardenDimensions) {
              setStep(3);
              setLoadingPlants(true);
              getZoneCompatiblePlants(growingZone, gardenDimensions.width, gardenDimensions.height)
                .then(result => {
                  setCompatiblePlants(result.plants);
                  setLoadingPlants(false);
                })
                .catch(error => {
                  console.error('Error fetching compatible plants:', error);
                  setLoadingPlants(false);
                });
            }
          }}
          selectedDimensions={gardenDimensions}
        />
      )
    },
    {
      title: "What Would You Like to Grow?",
      description: "Select plants that will thrive in your zone",
      icon: <PlantIcon className="w-20 h-20 text-spring-leaf-500" />,
      content: (
        <PlantSelection
          categories={plantCategories}
          selectedPlants={selectedPlants}
          onPlantSelect={handlePlantSelection}
          onNext={() => {
            if (selectedPlants.length >= 3) {
              setStep(4);
            } else {
              generateCompanionPlants(selectedPlants, growingZone)
                .then(suggestions => {
                  if (suggestions.length > 0) {
                    setCompanionSuggestions(suggestions);
                  } else {
                    const localSuggestions = getLocalCompanionPlants(selectedPlants);
                    setCompanionSuggestions(localSuggestions);
                  }
                })
                .catch(error => {
                  console.error('Error getting companion plants:', error);
                  const localSuggestions = getLocalCompanionPlants(selectedPlants);
                  setCompanionSuggestions(localSuggestions);
                });
            }
          }}
          compatiblePlants={compatiblePlants}
          companionSuggestions={companionSuggestions}
          loadingPlants={loadingPlants}
        />
      )
    },
    {
      title: "Perfect! Let's Design Your Garden",
      description: "We'll create a custom layout based on your selections",
      icon: <Sun className="w-20 h-20 text-spring-leaf-500" />,
      content: (
        <GenerationOptions 
          onComplete={handleComplete} 
          gardenSize={gardenDimensions!}
          selectedPlants={selectedPlantObjects}
          growingZone={growingZone}
        />
      )
    }
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-5xl mx-auto px-4">
        <div className="flex flex-col items-center text-center mb-12">
          {steps[step].icon}
          <h2 className="text-4xl font-display font-medium mt-8 text-forest-800 mb-4">{steps[step].title}</h2>
          <p className="text-forest-600 text-xl">{steps[step].description}</p>
        </div>
        
        <div className="mt-12">
          {steps[step].content}
        </div>

        <div className="mt-16 flex justify-center">
          <div className="flex space-x-3">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === step ? 'bg-spring-leaf-500' : 'bg-spring-leaf-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;