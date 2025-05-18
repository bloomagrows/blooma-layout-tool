import React, { useEffect, useState } from 'react';
import GardenLayout from '../components/GardenLayout';
import LoadingGarden from '../components/LoadingGarden';
import { getGardenLayout, safeStorage } from '../utils/supabase';
import { supabase } from '../utils/supabase';

const GardenPage: React.FC = () => {
  const [layout, setLayout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLayout = async () => {
      try {
        // Get layout ID from URL or storage
        const params = new URLSearchParams(window.location.search);
        const layoutId = params.get('id') || safeStorage.getItem('current_layout_id');
        const sessionId = safeStorage.getItem('onboarding_session_id');

        console.log('Loading layout with:', { layoutId, sessionId });

        if (!layoutId || layoutId === 'null') {
          setError('No valid layout ID provided. Please return to the home page to create a new garden layout.');
          setLoading(false);
          return;
        }

        if (!sessionId) {
          setError('Your session has expired. Please return to the home page to start over.');
          setLoading(false);
          return;
        }

        // Store the layout ID in storage
        safeStorage.setItem('current_layout_id', layoutId);

        // First check if the layout exists and its status
        const { data: generationData, error: generationError } = await supabase
          .from('garden_layout_generations')
          .select('status, error')
          .eq('generation_id', layoutId)
          .maybeSingle();

        console.log('Generation data:', { generationData, generationError });

        if (generationError) {
          console.error('Error checking generation status:', generationError);
          throw new Error('Failed to check layout status');
        }

        if (!generationData) {
          setError('Layout not found. Please return to the home page to create a new garden layout.');
          setLoading(false);
          return;
        }

        if (generationData.status === 'processing') {
          console.log('Layout is still processing');
          setLayout(null);
          setLoading(true);
          // Poll every 5 seconds for updates
          const timer = setTimeout(loadLayout, 5000);
          return () => clearTimeout(timer);
        }

        if (generationData.status === 'failed') {
          setError(generationData.error || 'Layout generation failed. Please try again.');
          setLoading(false);
          return;
        }

        // Try to get the actual layout data
        const layoutData = await getGardenLayout(sessionId, layoutId);
        console.log('Layout data:', layoutData);
        
        if (!layoutData) {
          setError('Layout not found or still processing. Please try again in a moment.');
        } else {
          setLayout(layoutData);
        }
      } catch (error) {
        console.error('Error loading layout:', error);
        setError(error instanceof Error ? error.message : 'Failed to load garden layout');
      } finally {
        setLoading(false);
      }
    };

    loadLayout();
  }, []);

  const handleBack = () => {
    // Clear the current layout ID from storage
    safeStorage.removeItem('current_layout_id');

    // In WebContainer, we need to handle navigation differently
    if (window.location.hostname === 'webcontainer.io') {
      // Update the URL without triggering a page reload
      window.history.pushState({}, '', '/');
      // Force a page reload to ensure proper state reset
      window.location.reload();
    } else {
      // Normal browser navigation
      window.location.href = '/';
    }
  };

  if (loading) {
    return <LoadingGarden useAI={true} />;
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
              className="inline-block px-6 py-3 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors font-medium shadow-md shadow-spring-leaf-500/20"
            >
              Return to Garden Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!layout) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-spring-leaf-50 to-cornflower-50 p-4 sm:p-8">
      <GardenLayout
        plants={layout.plants}
        width={layout.width}
        height={layout.height}
        sessionId={safeStorage.getItem('onboarding_session_id') || ''}
        isExistingLayout={true}
        generationId={safeStorage.getItem('current_layout_id') || undefined}
        paid={layout.paid}
        onBack={handleBack}
      />
    </div>
  );
};

export default GardenPage;