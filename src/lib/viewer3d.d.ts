export type ViewerItem = {
  id: string | number;
  l: number;
  w: number;
  h: number;
  x: number;
  y: number;
  z: number;
  rotated?: boolean;
  color?: string;
  weight: number;
  fits?: boolean;
};

export type ViewerDims = {
  length: number;
  width: number;
  height: number;
  maxWeight?: number;
};

export class SprinterViewer {
  constructor(containerId: string);
  loadVehicle(dimensions: ViewerDims): void;
  renderCargo(items: ViewerItem[]): void;
  clearCargo(): void;
  setCameraView(view: "top" | "side" | "back" | "iso" | "reset"): void;
  toggleGrid(visible: boolean): void;
  toggleTransparency(transparent: boolean): void;
  animateExplode(value?: number): void;
  dispose(): void;
}