import React, { useCallback, useRef, useState } from 'react';
import { PanelConfig, BorderSkin, SpriteSheet, getBorderThickness, BorderThickness } from '../types';
import SpriteBorder from './SpriteBorder';

export interface SnapTarget {
  id: string;
  // Outer rect (content + border)
  outerLeft: number;
  outerTop: number;
  outerRight: number;
  outerBottom: number;
}

interface PanelProps {
  panel: PanelConfig;
  borderSkin: BorderSkin | null;
  spriteSheets: SpriteSheet[];
  settingsMode: boolean;
  selected: boolean;
  snapToGrid: boolean;
  gridSize: number;
  canvasWidth: number;
  canvasHeight: number;
  snapTargets: SnapTarget[]; // other panels' outer rects for snapping
  onUpdate: (id: string, changes: Partial<PanelConfig>) => void;
  onSelect: (id: string) => void;
  onBringToFront: (id: string) => void;
}

const ASPECT_RATIOS: Record<string, number | null> = {
  'free': null,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '1:1': 1,
};

const MIN_SIZE = 50;
const EDGE_SNAP_THRESHOLD = 10;

function snapValue(value: number, gridSize: number, snap: boolean): number {
  if (!snap) return value;
  return Math.round(value / gridSize) * gridSize;
}

function edgeSnap(
  x: number, y: number, w: number, h: number,
  border: BorderThickness,
  canvasW: number, canvasH: number,
  snapTargets: SnapTarget[],
): { x: number; y: number } {
  let sx = x, sy = y;
  const T = EDGE_SNAP_THRESHOLD;

  // Our outer edges
  const myLeft = x - border.left;
  const myTop = y - border.top;
  const myRight = x + w + border.right;
  const myBottom = y + h + border.bottom;

  // --- Canvas edge snapping ---
  // Snap our outer left to canvas left (0)
  if (Math.abs(myLeft) < T) sx = border.left;
  // Snap our outer top to canvas top (0)
  if (Math.abs(myTop) < T) sy = border.top;
  // Snap our outer right to canvas right
  if (Math.abs(myRight - canvasW) < T) sx = canvasW - w - border.right;
  // Snap our outer bottom to canvas bottom
  if (Math.abs(myBottom - canvasH) < T) sy = canvasH - h - border.bottom;

  // --- Panel-to-panel snapping ---
  // Recalculate outer edges with any canvas snap applied
  const curLeft = sx - border.left;
  const curTop = sy - border.top;
  const curRight = sx + w + border.right;
  const curBottom = sy + h + border.bottom;

  for (const target of snapTargets) {
    // Our outer left snaps to target's outer right
    if (Math.abs(curLeft - target.outerRight) < T) {
      sx = target.outerRight + border.left;
    }
    // Our outer right snaps to target's outer left
    if (Math.abs(curRight - target.outerLeft) < T) {
      sx = target.outerLeft - w - border.right;
    }
    // Our outer top snaps to target's outer bottom
    if (Math.abs(curTop - target.outerBottom) < T) {
      sy = target.outerBottom + border.top;
    }
    // Our outer bottom snaps to target's outer top
    if (Math.abs(curBottom - target.outerTop) < T) {
      sy = target.outerTop - h - border.bottom;
    }

    // Also snap aligned edges (e.g. our left aligns with their left)
    if (Math.abs(curLeft - target.outerLeft) < T) {
      sx = target.outerLeft + border.left;
    }
    if (Math.abs(curRight - target.outerRight) < T) {
      sx = target.outerRight - w - border.right;
    }
    if (Math.abs(curTop - target.outerTop) < T) {
      sy = target.outerTop + border.top;
    }
    if (Math.abs(curBottom - target.outerBottom) < T) {
      sy = target.outerBottom - h - border.bottom;
    }
  }

  return { x: sx, y: sy };
}

const Panel: React.FC<PanelProps> = ({
  panel,
  borderSkin,
  spriteSheets,
  settingsMode,
  selected,
  snapToGrid,
  gridSize,
  canvasWidth,
  canvasHeight,
  snapTargets,
  onUpdate,
  onSelect,
  onBringToFront,
}) => {
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0, pw: 0, ph: 0 });
  const [hovered, setHovered] = useState(false);
  const border = getBorderThickness(borderSkin);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!settingsMode || panel.locked) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(panel.id);
    onBringToFront(panel.id);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: panel.x, py: panel.y, pw: panel.width, ph: panel.height };
    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      let newX = snapValue(dragStart.current.px + dx, gridSize, snapToGrid);
      let newY = snapValue(dragStart.current.py + dy, gridSize, snapToGrid);
      const snapped = edgeSnap(newX, newY, panel.width, panel.height, border, canvasWidth, canvasHeight, snapTargets);
      onUpdate(panel.id, { x: snapped.x, y: snapped.y });
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [settingsMode, panel, onUpdate, onSelect, onBringToFront, snapToGrid, gridSize, border, canvasWidth, canvasHeight, snapTargets]);

  const handleResizeStart = useCallback((handle: string, e: React.MouseEvent) => {
    if (!settingsMode || panel.locked) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(panel.id);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: panel.x, py: panel.y, pw: panel.width, ph: panel.height };
    const ratio = ASPECT_RATIOS[panel.aspectRatio];

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      const { px, py, pw, ph } = dragStart.current;

      let newX = px, newY = py, newW = pw, newH = ph;

      if (handle.includes('e')) newW = Math.max(MIN_SIZE, pw + dx);
      if (handle.includes('w')) { newW = Math.max(MIN_SIZE, pw - dx); newX = px + (pw - newW); }
      if (handle.includes('s')) newH = Math.max(MIN_SIZE, ph + dy);
      if (handle.includes('n')) { newH = Math.max(MIN_SIZE, ph - dy); newY = py + (ph - newH); }

      if (ratio) {
        if (handle === 'e' || handle === 'w') {
          newH = newW / ratio;
        } else if (handle === 'n' || handle === 's') {
          newW = newH * ratio;
        } else {
          const dw = Math.abs(newW - pw);
          const dh = Math.abs(newH - ph);
          if (dw > dh) {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }
        }
        if (handle.includes('n')) newY = py + (ph - newH);
        if (handle.includes('w')) newX = px + (pw - newW);
      }

      newX = snapValue(newX, gridSize, snapToGrid);
      newY = snapValue(newY, gridSize, snapToGrid);
      newW = snapValue(newW, gridSize, snapToGrid);
      newH = snapValue(newH, gridSize, snapToGrid);
      newW = Math.max(MIN_SIZE, newW);
      newH = Math.max(MIN_SIZE, newH);

      const snapped = edgeSnap(newX, newY, newW, newH, border, canvasWidth, canvasHeight, snapTargets);

      onUpdate(panel.id, { x: snapped.x, y: snapped.y, width: newW, height: newH });
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [settingsMode, panel, onUpdate, onSelect, snapToGrid, gridSize, border, canvasWidth, canvasHeight, snapTargets]);

  if (!panel.visible) return null;

  const resizeHandles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  const cursorMap: Record<string, string> = {
    n: 'ns-resize', s: 'ns-resize',
    e: 'ew-resize', w: 'ew-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
    nw: 'nwse-resize', se: 'nwse-resize',
  };

  const handleSize = 10;

  let outline = 'none';
  if (settingsMode) {
    if (selected) {
      outline = '2px solid #00ff88';
    } else if (hovered) {
      outline = '1px solid rgba(0,255,136,0.5)';
    } else {
      outline = '1px dashed rgba(255,255,255,0.15)';
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: panel.x,
        top: panel.y,
        width: panel.width,
        height: panel.height,
        zIndex: panel.zIndex,
        cursor: settingsMode && !panel.locked ? 'move' : 'default',
        outline,
        backgroundColor: panel.backgroundColor,
        border: !borderSkin && panel.borderColor ? panel.borderColor : 'none',
        overflow: 'visible',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => settingsMode && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Border skin — renders OUTSIDE the content area */}
      {borderSkin && (
        <SpriteBorder
          skin={borderSkin}
          spriteSheets={spriteSheets}
          width={panel.width}
          height={panel.height}
          borderBackgroundColor={panel.borderBackgroundColor}
        />
      )}

      {/* Settings mode label */}
      {settingsMode && (
        <div data-settings-ui style={{
          position: 'absolute',
          top: 4,
          left: 4,
          padding: '2px 8px',
          background: 'rgba(0,0,0,0.7)',
          color: '#00ff88',
          fontSize: 11,
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'nowrap',
        }}>
          {panel.label} ({Math.round(panel.width)}x{Math.round(panel.height)})
          {panel.aspectRatio !== 'free' ? ` [${panel.aspectRatio}]` : ''}
          {panel.locked ? ' [LOCKED]' : ''}
          {borderSkin ? ` [${borderSkin.name}]` : ''}
        </div>
      )}

      {/* Resize handles */}
      {settingsMode && !panel.locked && (selected || hovered) && resizeHandles.map(handle => {
        let hStyle: React.CSSProperties = {
          position: 'absolute',
          width: handleSize,
          height: handleSize,
          background: selected ? '#00ff88' : 'rgba(0,255,136,0.4)',
          cursor: cursorMap[handle],
          zIndex: 10000,
        };

        if (handle.includes('n')) hStyle.top = 0;
        if (handle.includes('s')) hStyle.bottom = 0;
        if (handle.includes('w')) hStyle.left = 0;
        if (handle.includes('e')) hStyle.right = 0;

        if (handle === 'n') { hStyle.left = '50%'; hStyle.marginLeft = -handleSize / 2; }
        if (handle === 's') { hStyle.left = '50%'; hStyle.marginLeft = -handleSize / 2; }
        if (handle === 'e') { hStyle.top = '50%'; hStyle.marginTop = -handleSize / 2; }
        if (handle === 'w') { hStyle.top = '50%'; hStyle.marginTop = -handleSize / 2; }

        return (
          <div
            key={handle}
            data-settings-ui
            style={hStyle}
            onMouseDown={(e) => handleResizeStart(handle, e)}
          />
        );
      })}
    </div>
  );
};

export default Panel;
