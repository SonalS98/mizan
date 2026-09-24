export type MappedFeature = {
  id: string; label: string; kind: string; url: string; coordinates: number[][];
};
export type ProjectMap = {
  retrieved: string; attribution: string; features: MappedFeature[];
};
export type PublishedEnergy = {
  assets: { source: "solar" | "wind" | "biogas"; capacityKw: number; assumedCapacityFactor?: number }[];
  metrics: { label: string; value: string }[];
  storage?: { powerMw: number; energyMwh: number; roundTripEfficiency: number };
};
