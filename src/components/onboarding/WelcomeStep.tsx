import React, { useState, useEffect } from 'react';
import { Sprout } from 'lucide-react';
import GardenHistory from './GardenHistory';
import type { GardenHistory as GardenHistoryType } from '../../types';
import { supabase } from '../../utils/supabase';

interface WelcomeStepProps {
  onNext: () => void;
  onSelectLayout: (layout: GardenHistoryType) => void;
  sessionId: string;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext, onSelectLayout, sessionId }) => {
  const [history, setHistory] = useState<GardenHistoryType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch garden history and handle URL parameters in a single effect
  useEffect(() => {
    const fetchGardenHistory = async () => {
      if (!sessionId) return;

      setLoadingHistory(true);
      try {
        // First get the session UUID
        const { data: sessionData } = await supabase
          .from('onboarding_sessions')
          .select('id')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (!sessionData) {
          console.log('No session found for ID:', sessionId);
          return;
        }

        // Get layouts with their generation status
        const { data: layouts, error: layoutError } = await supabase
          .from('garden_layouts_history')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('created_at', { ascending: false });

        if (layoutError) {
          console.error('Error fetching layouts:', layoutError);
          return;
        }

        if (layouts) {
          // Get generation status for layouts that have generation IDs
          const generationIds = layouts
            .map(l => l.generation_id)
            .filter(Boolean);

          let generations = [];
          if (generationIds.length > 0) {
            const { data: generationData } = await supabase
              .from('garden_layout_generations')
              .select('*')
              .in('generation_id', generationIds);
            
            generations = generationData || [];
          }

          // Combine layout data with generation status and session_id
          const historyWithStatus = layouts.map(layout => ({
            ...layout,
            session_id: sessionData.id,
            status: generations.find(g => g.generation_id === layout.generation_id)?.status || 'completed'
          }));

          console.log('Fetched garden history:', historyWithStatus);
          setHistory(historyWithStatus);

          // Check URL parameters after history is loaded
          const params = new URLSearchParams(window.location.search);
          const layoutId = params.get('layout');
          
          if (layoutId) {
            const layout = historyWithStatus.find(l => l.generation_id === layoutId);
            if (layout) {
              onSelectLayout(layout);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching garden history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchGardenHistory();
  }, [sessionId, onSelectLayout]);

  const handleDelete = async (layoutId: string) => {
    setHistory(prev => prev.filter(layout => layout.id !== layoutId));
  };

  const handleLayoutSelect = (layout: GardenHistoryType) => {
    // Update URL with layout ID
    const url = new URL(window.location.href);
    url.searchParams.set('layout', layout.generation_id || '');
    window.history.pushState({}, '', url.toString());
    
    onSelectLayout(layout);
  };

  return (
    <div className="text-center space-y-8 max-w-3xl mx-auto">
      {loadingHistory ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-spring-leaf-50 rounded-xl" />
          ))}
        </div>
      ) : (
        <GardenHistory 
          history={history}
          onSelectLayout={handleLayoutSelect}
          onDelete={handleDelete}
        />
      )}

      <div className="flex justify-center pt-8">
        <button
          onClick={onNext}
          className="px-8 py-4 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors text-lg font-medium shadow-lg shadow-spring-leaf-500/20"
        >
          Design New Garden
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;