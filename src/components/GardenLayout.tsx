import React, { useState, useEffect } from 'react';
import { Info, ArrowLeft, ExternalLink, Calendar, Lock, CheckCircle, Plus, Trash2 } from 'lucide-react';
import type { Plant } from '../types';
import { growingGuides, plantCategories, plantData, plantSpacing, plantHeights, sunRequirements } from '../utils/gardenData';
import { getGardenTimeline } from '../utils/openai';
import { saveGardenLayout } from '../utils/supabase';
import { loadStripe } from '@stripe/stripe-js';
import BloomaIcon from './BloomaIcon';

interface TimelineTask {
  month: string;
  week: number;
  task: string;
  plants: string[];
  type: 'sow' | 'transplant' | 'maintain' | 'harvest';
}

interface GardenLayoutProps {
  plants: Array<{
    plant: Plant;
    x: number;
    y: number;
  }>;
  width: number;
  height: number;
  onSave?: () => void;
  onBack?: () => void;
  sessionId: string;
  isExistingLayout?: boolean;
  generationId?: string;
  paid?: boolean;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const GardenLayout: React.FC<GardenLayoutProps> = ({ 
  plants: initialPlants, 
  width, 
  height, 
  onSave, 
  onBack,
  sessionId,
  isExistingLayout = false,
  generationId,
  paid = false
}) => {
  const gridSize = 12;
  const pixelsPerInch = 4;
  const [plants, setPlants] = useState(initialPlants);
  const [draggedPlant, setDraggedPlant] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [timeline, setTimeline] = useState<TimelineTask[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>('');

  // Create a flat list of all available plants
  const allAvailablePlants = Array.from(
    new Set(
      Object.values(plantCategories).flat()
    )
  ).sort();

  const area = width * height;
  const params = new URLSearchParams(window.location.search);
  const bypassPaywall = params.get('bypass') === 'true';
  const requiresPayment = area >= 64 && !paid && !bypassPaywall;

  const handleBack = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('layout');
    url.searchParams.delete('payment');
    window.history.pushState({}, '', url.toString());

    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    
    if (paymentStatus === 'success') {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    if (!Array.isArray(initialPlants) || initialPlants.length === 0) {
      setError('No plants data available');
      return;
    }

    const invalidPlants = initialPlants.filter(item => !item.plant || !item.plant.name);
    if (invalidPlants.length > 0) {
      console.error('Invalid plant data:', invalidPlants);
      setError('Invalid plant data detected');
      return;
    }

    setError(null);
  }, [initialPlants]);

  useEffect(() => {
    const fetchTimeline = async () => {
      if (error) return;

      setLoadingTimeline(true);
      try {
        const uniquePlants = Array.from(new Set(initialPlants.map(p => p.plant)))
          .filter((plant): plant is Plant => Boolean(plant));
        const result = await getGardenTimeline(uniquePlants, 7);
        setTimeline(result.timeline);
      } catch (error) {
        console.error('Error fetching timeline:', error);
      } finally {
        setLoadingTimeline(false);
      }
    };

    fetchTimeline();
  }, [error, initialPlants]);

  useEffect(() => {
    const saveLayout = async () => {
      if (!isExistingLayout && !error) {
        await saveGardenLayout({
          session_id: sessionId,
          layout_data: {
            plants: initialPlants,
            width,
            height
          },
          layout_type: 'ai_generated',
          status: 'completed'
        });
      }
    };

    if (sessionId) {
      saveLayout();
    }
  }, [sessionId, initialPlants, width, height, isExistingLayout, error]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://aivhebrzveblftbqfnzc.supabase.co/functions/v1/create-payment-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          gardenSize: { width, height },
          layoutGenerationId: generationId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('No checkout URL received');
      }

      if (generationId) {
        localStorage.setItem('pending_layout_id', generationId);
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Payment processing failed');
      setLoading(false);
    }
  };

  const handleAddPlant = async () => {
    if (!selectedPlant || !sessionId || !generationId) return;

    try {
      // Create a new plant object
      const newPlant: Plant = {
        id: `plant-${Date.now()}`,
        name: selectedPlant,
        scientificName: 'Placeholder',
        description: '',
        companionPlants: [],
        growingZones: [],
        spacing: plantSpacing[selectedPlant] || 12,
        height: plantHeights[selectedPlant] || 24,
        sunRequirement: sunRequirements[selectedPlant] || 'full',
        wateringNeeds: 'moderate',
        seasonality: ['spring', 'summer'],
        daysToMaturity: 60
      };

      // Place the plant in the center of the garden
      const centerX = Math.round((width * 12) / 2);
      const centerY = Math.round((height * 12) / 2);

      const updatedPlants = [
        ...plants,
        {
          plant: newPlant,
          x: centerX,
          y: centerY
        }
      ];

      setPlants(updatedPlants);

      // Save the updated layout
      await saveGardenLayout({
        session_id: sessionId,
        layout_data: {
          plants: updatedPlants,
          width,
          height
        },
        layout_type: 'user_modified',
        generation_id: generationId,
        status: 'completed'
      });
    } catch (error) {
      console.error('Error adding plant:', error);
      setError('Failed to add plant');
    }
  };

  const handleRemovePlant = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag start

    if (!sessionId || !generationId) return;

    try {
      const updatedPlants = plants.filter((_, i) => i !== index);
      setPlants(updatedPlants);

      // Save the updated layout
      await saveGardenLayout({
        session_id: sessionId,
        layout_data: {
          plants: updatedPlants,
          width,
          height
        },
        layout_type: 'user_modified',
        generation_id: generationId,
        status: 'completed'
      });
    } catch (error) {
      console.error('Error removing plant:', error);
      setError('Failed to remove plant');
    }
  };

  if (requiresPayment) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-spring-leaf-200 shadow-xl shadow-spring-leaf-500/10">
        <div className="text-center space-y-6 max-w-lg mx-auto">
          <div className="w-16 h-16 bg-spring-leaf-50 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-spring-leaf-500" />
          </div>
          <div>
            <h2 className="text-2xl font-display text-forest-800 mb-2">Unlock Your Pro Garden Layout</h2>
            <p className="text-forest-600">
              Your {width}' × {height}' garden layout is ready to view
            </p>
          </div>

          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-spring-leaf-500" />
              </div>
              <div>
                <h3 className="font-medium text-forest-800">Pro Garden Layout</h3>
                <p className="text-sm text-forest-600">
                  AI-optimized layout with companion planting and sunlight considerations
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-spring-leaf-500" />
              </div>
              <div>
                <h3 className="font-medium text-forest-800">Drag & Drop Customization</h3>
                <p className="text-sm text-forest-600">
                  Easily rearrange plants to customize your garden bed layout
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-spring-leaf-500" />
              </div>
              <div>
                <h3 className="font-medium text-forest-800">Save & View Anytime</h3>
                <p className="text-sm text-forest-600">
                  Access your garden layout whenever you need it
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-spring-leaf-500" />
              </div>
              <div>
                <h3 className="font-medium text-forest-800">Garden Timeline</h3>
                <p className="text-sm text-forest-600">
                  Month-by-month planting and maintenance schedule
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-heirloom-50 border border-heirloom-200 rounded-xl text-heirloom-700">
              {error}
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full px-6 py-4 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors font-medium shadow-lg shadow-spring-leaf-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                'Unlock Layout ($15)'
              )}
            </button>
            <button
              onClick={handleBack}
              className="mt-4 px-4 py-2 text-forest-600 hover:text-forest-800 transition-colors"
            >
              Return to Garden Setup
            </button>
          </div>

          <div className="text-sm text-forest-500">
            One-time payment • Secure checkout with Stripe
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-spring-leaf-50 to-cornflower-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-heirloom-200 shadow-xl shadow-heirloom-500/10 max-w-md">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-display text-heirloom-600">Unable to Load Garden Layout</h2>
            <p className="text-forest-600">{error}</p>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors font-medium shadow-md shadow-spring-leaf-500/20"
            >
              Return to Garden Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  const plantGroups = plants.reduce<Record<string, { plant: Plant; count: number }>>((acc, item) => {
    if (!item.plant?.name) return acc;
    
    const key = item.plant.name;
    if (!acc[key]) {
      acc[key] = {
        plant: item.plant,
        count: 0
      };
    }
    acc[key].count++;
    return acc;
  }, {});

  const handleDragStart = (index: number, e: React.MouseEvent) => {
    const plantElement = e.currentTarget as HTMLElement;
    const rect = plantElement.getBoundingClientRect();
    
    setDragOffset({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2
    });
    
    setDraggedPlant(index);
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (draggedPlant === null) return;

    const gardenElement = e.currentTarget as HTMLElement;
    const rect = gardenElement.getBoundingClientRect();
    
    const x = Math.round((e.clientX - rect.left - dragOffset.x) / pixelsPerInch);
    const y = Math.round((e.clientY - rect.top - dragOffset.y) / pixelsPerInch);
    
    const clampedX = Math.max(0, Math.min(width * 12, x));
    const clampedY = Math.max(0, Math.min(height * 12, y));

    const updatedPlants = [...plants];
    updatedPlants[draggedPlant] = {
      ...plants[draggedPlant],
      x: clampedX,
      y: clampedY
    };
    
    setPlants(updatedPlants);
  };

  const handleDragEnd = async () => {
    if (draggedPlant !== null && sessionId) {
      await saveGardenLayout({
        session_id: sessionId,
        layout_data: {
          plants,
          width,
          height
        },
        layout_type: 'user_modified',
        generation_id: generationId,
        status: 'completed'
      });
    }
    setDraggedPlant(null);
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'sow':
        return '🌱';
      case 'transplant':
        return '🪴';
      case 'maintain':
        return '✂️';
      case 'harvest':
        return '🌾';
      default:
        return '📝';
    }
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'sow':
        return 'bg-spring-leaf-50 border-spring-leaf-200';
      case 'transplant':
        return 'bg-cornflower-50 border-cornflower-200';
      case 'maintain':
        return 'bg-heirloom-50 border-heirloom-200';
      case 'harvest':
        return 'bg-spring-leaf-50 border-spring-leaf-200';
      default:
        return 'bg-spring-leaf-50 border-spring-leaf-200';
    }
  };
  
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-8 border border-spring-leaf-200 shadow-xl shadow-spring-leaf-500/10">
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display text-forest-800">Your Garden Layout</h2>
        </div>
        <p className="text-forest-600">
          Drag plants to reposition them in your garden
        </p>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-spring-leaf-50 text-forest-600 rounded-full hover:bg-spring-leaf-100 transition-colors border border-spring-leaf-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Plants</span>
          </button>

          <div className="flex gap-2">
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="px-4 py-2 bg-white text-forest-600 rounded-full border border-spring-leaf-200 focus:outline-none focus:ring-2 focus:ring-spring-leaf-500/50"
            >
              <option value="">Select a plant...</option>
              {allAvailablePlants.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
            <button
              onClick={handleAddPlant}
              disabled={!selectedPlant}
              className="flex items-center gap-2 px-4 py-2 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Add Plant</span>
            </button>
          </div>

          {onSave && (
            <button
              onClick={() => onSave()}
              className="px-6 py-2 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors font-medium shadow-md shadow-spring-leaf-500/20"
            >
              Save Layout
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <div 
            className="relative border-2 border-spring-leaf-200 rounded-xl overflow-hidden bg-spring-leaf-50"
            style={{
              width: width * 12 * pixelsPerInch,
              height: height * 12 * pixelsPerInch,
            }}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            <div className="absolute inset-0" style={{ 
              backgroundImage: 'linear-gradient(#9CCC5720 1px, transparent 1px), linear-gradient(90deg, #9CCC5720 1px, transparent 1px)',
              backgroundSize: `${gridSize * pixelsPerInch}px ${gridSize * pixelsPerInch}px`
            }} />
            
            {plants.map((item, index) => {
              if (!item.plant?.name) return null;
              
              const spacing = item.plant.spacing * pixelsPerInch;
              
              return (
                <div
                  key={index}
                  className={`absolute group cursor-move transition-transform ${
                    draggedPlant === index ? 'z-50 scale-105' : 'z-10'
                  }`}
                  style={{
                    left: (item.x * pixelsPerInch) - spacing,
                    top: (item.y * pixelsPerInch) - spacing,
                    width: spacing * 2,
                    height: spacing * 2,
                  }}
                  onMouseDown={(e) => handleDragStart(index, e)}
                >
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className={`absolute inset-0 border-2 border-spring-leaf-300 bg-white/40 group-hover:bg-spring-leaf-50/90 transition-colors rounded-full ${
                      draggedPlant === index ? 'border-spring-leaf-500 bg-spring-leaf-50/90' : ''
                    }`} />
                    
                    <div className="relative z-10">
                      <BloomaIcon name={item.plant.name} size="lg" />
                    </div>

                    <button
                      onClick={(e) => handleRemovePlant(index, e)}
                      className="absolute -top-2 -right-2 p-1 bg-white rounded-full border border-spring-leaf-200 text-heirloom-500 hover:bg-heirloom-50 hover:text-heirloom-600 transition-colors opacity-0 group-hover:opacity-100 z-20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                      <div className="bg-white px-4 py-2.5 rounded-xl shadow-lg text-sm whitespace-nowrap border border-spring-leaf-200">
                        <div className="font-medium text-forest-800">{item.plant.name}</div>
                        <div className="text-forest-600 text-xs">
                          {item.plant.spacing}" spacing • {item.plant.sunRequirement} sun
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center space-x-2 text-sm text-forest-600">
            <Info className="w-4 h-4" />
            <p>Grid squares represent 1 square foot • Drag plants to reposition them</p>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(plantGroups).map(([name, { plant, count }]) => {
              const guideUrl = growingGuides[name];
              
              return (
                <div key={name} className="flex items-start space-x-3 p-4 rounded-xl bg-spring-leaf-50 border border-spring-leaf-200">
                  <div className="flex-shrink-0">
                    <BloomaIcon name={name} size="md" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-forest-800">{name}</h3>
                      <span className="text-forest-600 text-sm bg-white px-2 py-0.5 rounded-full border border-spring-leaf-200">
                        ×{count}
                      </span>
                    </div>
                    <p className="text-sm text-forest-600 mt-1">
                      {plant.spacing}" spacing • {plant.sunRequirement} sun
                    </p>
                    {guideUrl && (
                      <a
                        href={guideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-forest-600 hover:text-forest-800 text-sm transition-colors mt-1"
                      >
                        <span>Growing guide</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-8">
            <h3 className="text-xl font-display text-forest-800 mb-4">Garden Timeline</h3>
            {loadingTimeline ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-spring-leaf-50 rounded-xl" />
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <div className="text-forest-600 text-center py-8">
                No timeline available
              </div>
            ) : (
              <div className="space-y-4">
                {timeline.map((task, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${getTaskColor(task.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getTaskIcon(task.type)}</span>
                      <div>
                        <div className="text-forest-800 font-medium">
                          {task.month} - Week {task.week}
                        </div>
                        <p className="text-forest-600 mt-1">{task.task}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {task.plants.map(plant => (
                            <span
                              key={plant}
                              className="px-2 py-1 bg-white rounded-full text-forest-600 text-sm border border-spring-leaf-200"
                            >
                              {plant}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GardenLayout;