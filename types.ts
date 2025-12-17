export interface Coordinates {
  x: number;
  y: number;
}

export interface VaseParts {
  neck: string;
  body: string;
  base: string;
}

export interface VaseAssets {
  image_url: string;
  depth_url?: string;
  parts: VaseParts;
}

export interface Vase {
  id: string;
  region: string;
  period?: string;
  globe_coordinates: Coordinates;
  assets: VaseAssets;
}

export enum AppMode {
  UNIVERSE = 'UNIVERSE',
  HYBRID = 'HYBRID',
}