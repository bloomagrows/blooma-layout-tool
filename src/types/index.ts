// Update types.ts to include GardenHistory type
export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  description: string;
  companionPlants: string[];
  growingZones: number[];
  spacing: number; // in inches
  height: number; // in inches
  sunRequirement: 'full' | 'partial' | 'shade';
  wateringNeeds: 'low' | 'moderate' | 'high';
  seasonality: ('spring' | 'summer' | 'fall' | 'winter')[];
  daysToMaturity: number;
}

export interface GardenLayout {
  id: string;
  userId?: string;
  plants: Array<{
    plantId: string;
    x: number;
    y: number;
  }>;
  width: number; // in feet
  height: number; // in feet
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  growingZone: number;
  savedGardens: string[];
}

export interface GardenHistory {
  id: string;
  layout_data: any;
  layout_type: 'ai_generated' | 'user_modified';
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}