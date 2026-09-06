export interface SpriteRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BorderTile {
  region: SpriteRegion;
  spriteSheetId: string;
  flipH: boolean;
  flipV: boolean;
  rotation: 0 | 90 | 180 | 270;
}

export type EdgeFitMode = 'clip' | 'fit';

export interface BorderSkin {
  id: string;
  name: string;
  scale: number; // e.g. 2 = 2x pixel scaling
  edgeFitMode: EdgeFitMode; // clip = cut off at corners, fit = stretch/compress to fill
  topLeft: BorderTile | null;
  top: BorderTile | null;
  topRight: BorderTile | null;
  right: BorderTile | null;
  bottomRight: BorderTile | null;
  bottom: BorderTile | null;
  bottomLeft: BorderTile | null;
  left: BorderTile | null;
}

export interface SpriteSheet {
  id: string;
  name: string;
  dataUrl: string; // base64 data URL for persistence
  tileWidth: number;
  tileHeight: number;
  imageWidth: number;
  imageHeight: number;
}

export type AspectRatio = 'free' | '4:3' | '16:9' | '1:1';

export interface PanelConfig {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  borderSkinId: string | null;
  borderColor: string; // CSS border when no sprite skin, e.g. "2px solid #444"
  borderBackgroundColor: string; // background behind the sprite border frame
  visible: boolean;
  zIndex: number;
  backgroundColor: string;
  locked: boolean;
}

export interface OverlayState {
  panels: PanelConfig[];
  spriteSheets: SpriteSheet[];
  borderSkins: BorderSkin[];
  canvasWidth: number;
  canvasHeight: number;
  canvasBackgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
}

export const DEFAULT_STATE: OverlayState = {
  panels: [
    {
      id: 'game',
      label: 'Game',
      x: 576,
      y: 32,
      width: 1312,
      height: 984,
      aspectRatio: '4:3',
      borderSkinId: null,
      borderColor: '2px solid #333',
      borderBackgroundColor: '#000000',
      visible: true,
      zIndex: 0,
      backgroundColor: 'transparent',
      locked: false,
    },
    {
      id: 'camera',
      label: 'Camera',
      x: 32,
      y: 580,
      width: 512,
      height: 384,
      aspectRatio: '4:3',
      borderSkinId: null,
      borderColor: '2px solid #333',
      borderBackgroundColor: '#000000',
      visible: true,
      zIndex: 1,
      backgroundColor: 'transparent',
      locked: false,
    },
    {
      id: 'info',
      label: 'Info',
      x: 32,
      y: 32,
      width: 512,
      height: 516,
      aspectRatio: 'free',
      borderSkinId: null,
      borderColor: '2px solid #333',
      borderBackgroundColor: '#000000',
      visible: true,
      zIndex: 2,
      backgroundColor: 'rgba(0,0,0,0.5)',
      locked: false,
    },
  ],
  spriteSheets: [],
  borderSkins: [],
  canvasWidth: 1920,
  canvasHeight: 1080,
  canvasBackgroundColor: 'transparent',
  showGrid: false,
  gridSize: 16,
  snapToGrid: false,
};

export function createEmptyBorderSkin(id: string, name: string): BorderSkin {
  return {
    id,
    name,
    scale: 2,
    edgeFitMode: 'fit',
    topLeft: null,
    top: null,
    topRight: null,
    right: null,
    bottomRight: null,
    bottom: null,
    bottomLeft: null,
    left: null,
  };
}

export interface BorderThickness {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function getBorderThickness(skin: BorderSkin | null): BorderThickness {
  if (!skin) return { top: 0, right: 0, bottom: 0, left: 0 };
  const s = skin.scale;
  return {
    top: Math.max(
      skin.top ? skin.top.region.height * s : 0,
      skin.topLeft ? skin.topLeft.region.height * s : 0,
      skin.topRight ? skin.topRight.region.height * s : 0,
    ),
    bottom: Math.max(
      skin.bottom ? skin.bottom.region.height * s : 0,
      skin.bottomLeft ? skin.bottomLeft.region.height * s : 0,
      skin.bottomRight ? skin.bottomRight.region.height * s : 0,
    ),
    left: Math.max(
      skin.left ? skin.left.region.width * s : 0,
      skin.topLeft ? skin.topLeft.region.width * s : 0,
      skin.bottomLeft ? skin.bottomLeft.region.width * s : 0,
    ),
    right: Math.max(
      skin.right ? skin.right.region.width * s : 0,
      skin.topRight ? skin.topRight.region.width * s : 0,
      skin.bottomRight ? skin.bottomRight.region.width * s : 0,
    ),
  };
}

export function createEmptyBorderTile(spriteSheetId: string, region: SpriteRegion): BorderTile {
  return {
    region,
    spriteSheetId,
    flipH: false,
    flipV: false,
    rotation: 0,
  };
}
