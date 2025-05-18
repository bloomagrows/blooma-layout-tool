import type { Plant } from '../types';

interface PlacementResult {
  x: number;
  y: number;
  plant: Plant;
}

export function generateGardenLayout(
  selectedPlants: Plant[],
  width: number, // feet
  height: number // feet
): PlacementResult[] {
  const layout: PlacementResult[] = [];
  const grid = Array(height * 12).fill(null).map(() => Array(width * 12).fill(false));
  
  // Sort plants by size (larger plants first)
  const sortedPlants = [...selectedPlants].sort((a, b) => b.spacing - a.spacing);
  
  for (const plant of sortedPlants) {
    const spacing = plant.spacing;
    let placed = false;
    
    // Try to find a suitable spot
    for (let y = 0; y < height * 12 - spacing && !placed; y += spacing) {
      for (let x = 0; x < width * 12 - spacing && !placed; x += spacing) {
        if (isSpaceAvailable(grid, x, y, spacing)) {
          // Place the plant
          markSpaceAsOccupied(grid, x, y, spacing);
          layout.push({ x, y, plant });
          placed = true;
        }
      }
    }
  }
  
  return layout;
}

function isSpaceAvailable(
  grid: boolean[][],
  x: number,
  y: number,
  spacing: number
): boolean {
  for (let i = y; i < y + spacing; i++) {
    for (let j = x; j < x + spacing; j++) {
      if (grid[i]?.[j]) return false;
    }
  }
  return true;
}

function markSpaceAsOccupied(
  grid: boolean[][],
  x: number,
  y: number,
  spacing: number
): void {
  for (let i = y; i < y + spacing; i++) {
    for (let j = x; j < x + spacing; j++) {
      grid[i][j] = true;
    }
  }
}