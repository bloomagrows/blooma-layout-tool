import { createClient } from '@supabase/supabase-js';
import type { Plant } from '../types';
import { plantHeights, sunRequirements, plantSpacing } from './gardenData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Safe storage access wrapper
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Storage access failed:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Storage access failed:', error);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Storage access failed:', error);
    }
  }
};

// Generate a unique session ID for anonymous users
export const generateSessionId = () => {
  return `session_${Math.random().toString(36).substring(2)}${Date.now()}`;
};

interface OnboardingSession {
  user_id?: string;
  session_id: string;
  growing_zone?: number;
  garden_width?: number;
  garden_height?: number;
  selected_plants?: string[];
  status: 'in_progress' | 'completed' | 'abandoned';
  user_agent?: string;
  screen_size?: { width: number; height: number };
  notification_email?: string;
}

interface OnboardingStep {
  session_id: string;
  step_number: number;
  step_name: string;
  user_input?: any;
  ai_recommendations?: any;
  time_spent_seconds?: number;
  success: boolean;
}

interface GardenLayout {
  session_id: string;
  user_id?: string;
  layout_data: any;
  layout_type: 'ai_generated' | 'user_modified';
  generation_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Helper function to minimize plant data for storage
function minimizePlantData(plant: Plant) {
  return {
    name: plant.name,
    spacing: plant.spacing
  };
}

// Helper function to expand minimized plant data
function expandPlantData(minPlant: { name: string; spacing: number }): Plant {
  return {
    id: `plant-${Math.random().toString(36).substring(2)}`,
    name: minPlant.name,
    scientificName: 'Placeholder',
    description: '',
    companionPlants: [],
    growingZones: [],
    spacing: minPlant.spacing,
    height: plantHeights[minPlant.name] || 24,
    sunRequirement: sunRequirements[minPlant.name] || 'full',
    wateringNeeds: 'moderate',
    seasonality: ['spring', 'summer'],
    daysToMaturity: 60
  };
}

export async function getGardenLayout(sessionId: string, generationId: string) {
  console.log('Getting garden layout:', { sessionId, generationId });
  
  try {
    if (!sessionId || !generationId) {
      throw new Error('Session ID and Generation ID are required');
    }

    // First get the session UUID
    const { data: sessionData, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('Error getting session:', sessionError);
      throw new Error('Failed to retrieve session data');
    }

    if (!sessionData) {
      console.error('Session not found:', { sessionId });
      throw new Error('Session not found');
    }

    console.log('Found session:', sessionData);

    // Check the generation status first
    const { data: generationData, error: generationError } = await supabase
      .from('garden_layout_generations')
      .select('status, error')
      .eq('generation_id', generationId)
      .maybeSingle();

    if (generationError) {
      console.error('Error checking generation status:', generationError);
      throw new Error('Failed to check layout status');
    }

    if (!generationData) {
      console.error('Generation not found:', { generationId });
      throw new Error('Layout generation not found');
    }

    if (generationData.status !== 'completed') {
      console.log('Generation not completed:', { status: generationData.status });
      return null;
    }

    // Get the layout with the matching generation ID
    const { data: layoutData, error: layoutError } = await supabase
      .from('garden_layouts_history')
      .select('*')
      .eq('session_id', sessionData.id)
      .eq('generation_id', generationId)
      .maybeSingle();

    if (layoutError) {
      console.error('Error getting layout:', layoutError);
      throw new Error('Failed to retrieve layout data');
    }

    if (!layoutData) {
      console.error('Layout not found:', { sessionId, generationId });
      return null;
    }

    console.log('Found layout:', layoutData);

    // Validate layout data structure
    if (!layoutData.layout_data || !Array.isArray(layoutData.layout_data.plants)) {
      console.error('Invalid layout data structure:', layoutData.layout_data);
      throw new Error('Invalid layout data structure');
    }

    // Expand the minimized plant data
    const expandedLayout = {
      plants: layoutData.layout_data.plants.map((item: any) => ({
        plant: expandPlantData(item.plant),
        x: item.x,
        y: item.y
      })),
      width: layoutData.layout_data.width,
      height: layoutData.layout_data.height,
      paid: layoutData.paid
    };

    console.log('Expanded layout:', expandedLayout);
    return expandedLayout;
  } catch (error) {
    console.error('Error getting garden layout:', error);
    throw error;
  }
}

export async function saveGardenLayout(data: GardenLayout) {
  console.log('Starting saveGardenLayout with data:', {
    session_id: data.session_id,
    layout_type: data.layout_type,
    generation_id: data.generation_id,
    has_layout_data: !!data.layout_data
  });

  try {
    if (!data.session_id) {
      console.error('saveGardenLayout: Missing session_id');
      throw new Error('Session ID is required');
    }

    if (!data.layout_type) {
      console.error('saveGardenLayout: Missing layout_type');
      throw new Error('Layout type is required');
    }

    if (!['ai_generated', 'user_modified'].includes(data.layout_type)) {
      console.error('saveGardenLayout: Invalid layout_type:', data.layout_type);
      throw new Error('Invalid layout type. Must be "ai_generated" or "user_modified"');
    }

    // First get the session UUID
    console.log('Fetching session UUID for session_id:', data.session_id);
    const { data: sessionData, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('id')
      .eq('session_id', data.session_id)
      .maybeSingle();

    if (sessionError) {
      console.error('saveGardenLayout: Error fetching session:', sessionError);
      throw sessionError;
    }
    
    if (!sessionData) {
      console.error('saveGardenLayout: Session not found for ID:', data.session_id);
      throw new Error('Session not found');
    }

    console.log('Found session UUID:', sessionData.id);

    // Validate layout data
    if (!data.layout_data || typeof data.layout_data !== 'object') {
      console.error('saveGardenLayout: Invalid layout_data:', data.layout_data);
      throw new Error('Invalid layout data');
    }

    // Ensure layout data has required properties
    const layoutData = {
      width: data.layout_data.width || 0,
      height: data.layout_data.height || 0,
      plants: Array.isArray(data.layout_data.plants) ? data.layout_data.plants : []
    };

    console.log('Validated layout data:', {
      width: layoutData.width,
      height: layoutData.height,
      plant_count: layoutData.plants.length
    });

    // Minimize plant data if we have plants
    const minimizedLayoutData = {
      ...layoutData,
      plants: layoutData.plants.map((item: { plant: Plant; x: number; y: number }) => {
        console.log('Processing plant:', {
          name: item.plant.name,
          x: item.x,
          y: item.y,
          spacing: item.plant.spacing
        });
        return {
          plant: minimizePlantData(item.plant),
          x: item.x,
          y: item.y
        };
      })
    };

    console.log('Minimized layout data:', {
      width: minimizedLayoutData.width,
      height: minimizedLayoutData.height,
      plant_count: minimizedLayoutData.plants.length
    });

    // If this is a user modification to an existing layout, update it
    if (data.layout_type === 'user_modified' && data.generation_id) {
      console.log('Updating existing layout:', data.generation_id);
      
      const { error: updateError } = await supabase
        .from('garden_layouts_history')
        .update({
          layout_data: minimizedLayoutData,
          status: 'completed'
        })
        .eq('session_id', sessionData.id)
        .eq('generation_id', data.generation_id);

      if (updateError) {
        console.error('Error updating layout:', updateError);
        throw updateError;
      }

      return true;
    }

    // Otherwise, create a new layout
    const insertData = {
      session_id: sessionData.id,
      layout_data: minimizedLayoutData,
      layout_type: data.layout_type,
      generation_id: data.generation_id,
      status: data.status || (data.layout_type === 'ai_generated' ? 'pending' : 'completed')
    };

    console.log('Inserting new layout:', {
      session_id: insertData.session_id,
      layout_type: insertData.layout_type,
      generation_id: insertData.generation_id,
      status: insertData.status,
      plant_count: minimizedLayoutData.plants.length
    });

    const { error: insertError } = await supabase
      .from('garden_layouts_history')
      .insert([insertData]);

    if (insertError) {
      console.error('saveGardenLayout: Error inserting layout:', insertError);
      throw insertError;
    }

    console.log('Successfully saved garden layout');
    return true;
  } catch (error) {
    console.error('Error saving garden layout:', error);
    return false;
  }
}

export async function createOnboardingSession(data: Partial<OnboardingSession>) {
  try {
    // First try to get the existing session
    const { data: existingSession } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('session_id', data.session_id)
      .maybeSingle();

    if (existingSession) {
      // If session exists, update it
      const { data: updatedSession, error: updateError } = await supabase
        .from('onboarding_sessions')
        .update({
          ...data,
          user_agent: window.navigator.userAgent,
          screen_size: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        })
        .eq('session_id', data.session_id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedSession;
    } else {
      // If session doesn't exist, create a new one
      const { data: newSession, error: insertError } = await supabase
        .from('onboarding_sessions')
        .insert([{
          ...data,
          user_agent: window.navigator.userAgent,
          screen_size: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      return newSession;
    }
  } catch (error) {
    console.error('Error creating/updating onboarding session:', error);
    return null;
  }
}

export async function updateOnboardingSession(sessionId: string, data: Partial<OnboardingSession>) {
  try {
    const { error } = await supabase
      .from('onboarding_sessions')
      .update(data)
      .eq('session_id', sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating onboarding session:', error);
    return false;
  }
}

export async function recordOnboardingStep(data: OnboardingStep) {
  try {
    // First get the session UUID
    const { data: sessionData } = await supabase
      .from('onboarding_sessions')
      .select('id')
      .eq('session_id', data.session_id)
      .maybeSingle();

    if (!sessionData) {
      throw new Error('Session not found');
    }

    // Now create the step with the correct session UUID
    const { error: insertError } = await supabase
      .from('onboarding_steps')
      .insert([{
        ...data,
        session_id: sessionData.id
      }]);

    if (insertError) throw insertError;
    return true;
  } catch (error) {
    console.error('Error recording onboarding step:', error);
    return false;
  }
}