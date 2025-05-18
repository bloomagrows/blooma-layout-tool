import OpenAI from 'openai';
import type { Plant } from '../types';
import { plantData } from './gardenData';
import { OPENAI_MODELS } from '../constants/openai';
import { supabase } from './supabase';

interface DebugEntry {
  timestamp: number;
  prompt: string;
  response: string;
  error?: string;
  details?: Record<string, any>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Debug state
let debugEntries: DebugEntry[] = [];
let debugCallback: ((entries: DebugEntry[]) => void) | null = null;

export function setDebugCallback(callback: (entries: DebugEntry[]) => void) {
  debugCallback = callback;
}

function addDebugEntry(entry: DebugEntry) {
  debugEntries = [entry, ...debugEntries].slice(0, 50); // Keep last 50 entries
  debugCallback?.(debugEntries);
}

// Export debug entries for external access
export function getDebugEntries() {
  return debugEntries;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Helper function to convert zone string (e.g., "8a") to number (8)
function zoneStringToNumber(zone: string): number {
  return parseInt(zone.replace(/[a-b]/i, ''));
}

export async function getGrowingZone(zipCode: string): Promise<number> {
  try {
    // First try PHZMAPI
    const response = await fetch(`https://phzmapi.org/${zipCode}.json`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.zone) {
        addDebugEntry({
          timestamp: Date.now(),
          prompt: `PHZMAPI lookup for zip code ${zipCode}`,
          response: JSON.stringify(data),
          details: {
            source: 'phzmapi.org',
            zipCode,
            rawZone: data.zone
          }
        });
        
        return zoneStringToNumber(data.zone);
      }
    }
    
    // Fallback to OpenAI if PHZMAPI fails
    console.log('Falling back to OpenAI for zone lookup...');
    
    const prompt = `As a gardening expert, what is the USDA hardiness growing zone for zip code ${zipCode}? 
    Only return the zone number (e.g., 6 for zone 6, 7 for zone 7). If a zip code has multiple zones, return the lower zone number.
    Return only the number, nothing else.`;

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODELS.O_ONE,
      messages: [{ role: "user", content: prompt }],
    });

    const result = completion.choices[0].message.content || '0';
    
    addDebugEntry({
      timestamp: Date.now(),
      prompt,
      response: result,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      },
      details: {
        source: 'openai',
        zipCode
      }
    });

    const zone = parseInt(result);
    return isNaN(zone) ? 0 : zone;
  } catch (error) {
    console.error('Error getting growing zone:', error);
    addDebugEntry({
      timestamp: Date.now(),
      prompt: `Zone lookup for zip code ${zipCode}`,
      response: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        zipCode,
        errorType: error instanceof Error ? error.name : 'Unknown'
      }
    });
    return 0;
  }
}

export async function getZoneCompatiblePlants(zone: number, gardenWidth?: number, gardenHeight?: number): Promise<{
  plants: Array<{
    name: string;
    recommended: boolean;
    reason?: string;
  }>;
}> {
  await new Promise(resolve => setTimeout(resolve, 2000));

  const compatiblePlants = Object.entries(plantData)
    .map(([name, data]) => {
      const [minZone, maxZone] = data.zones.split('-').map(Number);
      const isZoneCompatible = zone >= minZone && zone <= maxZone;

      let isRecommended = isZoneCompatible;
      let reason = isZoneCompatible ? undefined : `Not suitable for zone ${zone} (requires zones ${data.zones})`;

      if (isZoneCompatible && gardenWidth && gardenHeight) {
        const gardenWidthInches = gardenWidth * 12;
        const gardenHeightInches = gardenHeight * 12;
        const smallestDimension = Math.min(gardenWidthInches, gardenHeightInches);
        const gardenArea = gardenWidthInches * gardenHeightInches;

        if (data.spacing > smallestDimension / 1) {
          isRecommended = false;
          reason = `Requires ${data.spacing}" spacing, which is too large for your ${gardenWidth}' × ${gardenHeight}' garden`;
        } else if (data.height > 72 && gardenArea < 32 * 144) {
          return {
            name,
            recommended: true,
            warning: `This plant grows to ${Math.round(data.height / 12)}' tall and may require additional support structures in your garden.`
          };
        } else if (data.height > 48 && gardenArea < 16 * 144) {
          return {
            name,
            recommended: true,
            warning: `This vining plant needs more space for proper support structures.`
          };
        }
      }

      return {
        name,
        recommended: isRecommended,
        reason
      };
    });

  return {
    plants: compatiblePlants
  };
}

export async function generateCompanionPlants(selectedPlants: string[], growingZone: number): Promise<string[]> {
  const prompt = `As an expert gardener, recommend 3 companion plants that would work well with these plants in USDA hardiness zone ${growingZone}: ${selectedPlants.join(', ')}. 
  Consider factors like:
  - Space utilization
  - Pest control
  - Soil health
  - Growth patterns
  
  Choose ONLY from these available plants with their growing zones:
  ${Object.entries(plantData)
    .map(([name, data]) => `${name} (zones ${data.zones})`)
    .join('\n')}

  Return plant names as a comma-separated list, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODELS.O_MINI,
      messages: [{ role: "user", content: prompt }],
    });

    const result = completion.choices[0].message.content || '';
    
    addDebugEntry({
      timestamp: Date.now(),
      prompt,
      response: result,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      }
    });

    return result.split(',')
      .map(p => p.trim())
      .filter(p => p in plantData);
  } catch (error) {
    addDebugEntry({
      timestamp: Date.now(),
      prompt,
      response: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('Error getting companion plants:', error);
    return [];
  }
}

export async function optimizeGardenLayout(
  plants: Plant[],
  width: number,
  height: number,
  growingZone: number,
  sessionId: string
): Promise<string> {
  if (!plants || plants.length === 0) {
    throw new Error('No plants provided');
  }

  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  const generationId = `layout_${Math.random().toString(36).substring(2)}${Date.now()}`;

  try {
    // Get session UUID
    const { data: sessionData, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error('Session not found');
    }

    // Create initial garden layout entry with pending status
    const { error: layoutError } = await supabase
      .from('garden_layouts_history')
      .insert({
        session_id: sessionData.id,
        layout_data: {
          plants: plants.map(plant => ({
            plant: {
              name: plant.name,
              spacing: plant.spacing
            },
            x: 0,
            y: 0
          })),
          width,
          height
        },
        layout_type: 'ai_generated',
        generation_id: generationId,
        status: 'pending'
      });

    if (layoutError) {
      throw layoutError;
    }

    // Create generation record
    const { error: generationError } = await supabase
      .from('garden_layout_generations')
      .insert({
        session_id: sessionData.id,
        generation_id: generationId,
        status: 'processing'
      });

    if (generationError) {
      throw generationError;
    }

    // Call the Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-garden-layout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        plants,
        width,
        height,
        growingZone,
        sessionId,
        generationId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start garden layout generation');
    }

    return generationId;
  } catch (error) {
    console.error('Error starting garden layout generation:', error);
    throw error;
  }
}

export async function getGardenTimeline(plants: Plant[], growingZone: number): Promise<any> {
  const prompt = `As a gardening expert, create a chronological timeline of gardening tasks for these plants in USDA hardiness zone ${growingZone}:
  ${plants.map(p => p.name).join(', ')}

  Consider:
  1. Proper planting times based on the growing zone
  2. Whether to direct sow or transplant
  3. Key maintenance tasks (pruning, fertilizing, etc.)
  4. Approximate harvest times
  5. Season extension techniques if needed

  Return a JSON array of tasks, sorted chronologically, with this structure:
  {
    "timeline": [
      {
        "month": "string (e.g., 'March')",
        "week": number (1-4),
        "task": "string (the task description)",
        "plants": ["plant names involved"],
        "type": "string (sow|transplant|maintain|harvest)"
      }
    ]
  }

  ONLY RETURN THE JSON, no other text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODELS.GPT4,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = completion.choices[0].message.content || '{"timeline": []}';
    
    addDebugEntry({
      timestamp: Date.now(),
      prompt,
      response: result,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      }
    });

    return JSON.parse(result);
  } catch (error) {
    addDebugEntry({
      timestamp: Date.now(),
      prompt,
      response: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('Error getting garden timeline:', error);
    return { timeline: [] };
  }
}