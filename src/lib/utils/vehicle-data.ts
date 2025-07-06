import vehicleData from '@/data/vehicle-size-data.json';

export interface VehicleEntry {
  make: string;
  model: string;
  trim: string;
  size: 'S' | 'M' | 'L' | 'XL';
}

export const sizeMap = {
  'S': 'Small',
  'M': 'Medium',
  'L': 'Large',
  'XL': 'Extra Large',
} as const;

// Cast the imported data to the correct type
const typedVehicleData = vehicleData as VehicleEntry[];

// Get unique makes from the data
export function getUniqueMakes(): string[] {
  const makes = new Set(typedVehicleData.map(entry => entry.make));
  return Array.from(makes).sort();
}

// Get models for a specific make
export function getModelsForMake(make: string): string[] {
  const models = new Set(
    typedVehicleData
      .filter(entry => entry.make === make)
      .map(entry => entry.model)
  );
  return Array.from(models).sort();
}

// Get size for a specific make and model
export function getSizeForVehicle(make: string, model: string): keyof typeof sizeMap | undefined {
  const entries = typedVehicleData.filter(
    entry => entry.make === make && entry.model === model
  );
  
  if (entries.length === 0) return undefined;
  
  // If we have multiple entries with different sizes, take the most common one
  const sizeCounts = entries.reduce((acc, entry) => {
    acc[entry.size] = (acc[entry.size] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonSize = Object.entries(sizeCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as keyof typeof sizeMap;
  
  return mostCommonSize;
}

// Get the full label for a size code
export function getSizeLabel(sizeCode: keyof typeof sizeMap): string {
  return sizeMap[sizeCode];
} 