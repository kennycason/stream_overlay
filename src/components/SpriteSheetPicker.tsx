import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SpriteSheet, SpriteRegion } from '../types';

interface SpriteSheetPickerProps {
  sheet: SpriteSheet;
  onSelectRegion: (region: SpriteRegion) => void;
  selectedRegion: SpriteRegion | null;
}

const PICKER_ZOOM = 3;

const SpriteSheetPicker: React.FC<SpriteSheetPickerProps> = ({ sheet, onSelectRegion, selectedRegion }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null);
  const [customSelect, setCustomSelect] = useState(false);
  const [selectStart, setSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [selectEnd, setSelectEnd] = useState<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const cols = Math.floor(sheet.imageWidth / sheet.tileWidth);
  const rows = Math.floor(sheet.imageHeight / sheet.tileHeight);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0, sheet.imageWidth * PICKER_ZOOM, sheet.imageHeight * PICKER_ZOOM);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      const x = c * sheet.tileWidth * PICKER_ZOOM;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * sheet.tileHeight * PICKER_ZOOM;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }

    if (hover && !customSelect) {
      ctx.fillStyle = 'rgba(0,255,136,0.25)';
      ctx.fillRect(
        hover.col * sheet.tileWidth * PICKER_ZOOM,
        hover.row * sheet.tileHeight * PICKER_ZOOM,
        sheet.tileWidth * PICKER_ZOOM,
        sheet.tileHeight * PICKER_ZOOM,
      );
    }

    if (customSelect && selectStart && selectEnd) {
      const sx = Math.min(selectStart.x, selectEnd.x) * PICKER_ZOOM;
      const sy = Math.min(selectStart.y, selectEnd.y) * PICKER_ZOOM;
      const sw = Math.abs(selectEnd.x - selectStart.x) * PICKER_ZOOM;
      const sh = Math.abs(selectEnd.y - selectStart.y) * PICKER_ZOOM;
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.fillStyle = 'rgba(255,102,0,0.15)';
      ctx.fillRect(sx, sy, sw, sh);
    }

    if (selectedRegion) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        selectedRegion.x * PICKER_ZOOM,
        selectedRegion.y * PICKER_ZOOM,
        selectedRegion.width * PICKER_ZOOM,
        selectedRegion.height * PICKER_ZOOM,
      );
    }
  }, [hover, selectedRegion, sheet, cols, rows, customSelect, selectStart, selectEnd]);

  useEffect(() => {
    const img = new Image();
    img.src = sheet.dataUrl;
    img.onload = () => {
      imgRef.current = img;
      drawCanvas();
    };
  }, [sheet.dataUrl, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getGridPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect || !canvas) return null;
    // Account for CSS scaling: map mouse coords to canvas pixel coords
    const cssToCanvas = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * cssToCanvas / PICKER_ZOOM;
    const y = (e.clientY - rect.top) * cssToCanvas / PICKER_ZOOM;
    return {
      col: Math.floor(x / sheet.tileWidth),
      row: Math.floor(y / sheet.tileHeight),
      pixelX: x,
      pixelY: y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getGridPos(e);
    if (!pos) return;

    if (customSelect && selectStart) {
      setSelectEnd({ x: pos.pixelX, y: pos.pixelY });
    } else if (!customSelect) {
      setHover({ col: pos.col, row: pos.row });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (customSelect) {
      const pos = getGridPos(e);
      if (!pos) return;
      setSelectStart({ x: pos.pixelX, y: pos.pixelY });
      setSelectEnd({ x: pos.pixelX, y: pos.pixelY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (customSelect && selectStart && selectEnd) {
      const x = Math.min(selectStart.x, selectEnd.x);
      const y = Math.min(selectStart.y, selectEnd.y);
      const w = Math.abs(selectEnd.x - selectStart.x);
      const h = Math.abs(selectEnd.y - selectStart.y);
      if (w > 2 && h > 2) {
        onSelectRegion({
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(w),
          height: Math.round(h),
        });
      }
      setSelectStart(null);
      setSelectEnd(null);
      return;
    }

    const pos = getGridPos(e);
    if (!pos) return;
    if (pos.col >= 0 && pos.col < cols && pos.row >= 0 && pos.row < rows) {
      onSelectRegion({
        x: pos.col * sheet.tileWidth,
        y: pos.row * sheet.tileHeight,
        width: sheet.tileWidth,
        height: sheet.tileHeight,
      });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: '#aaa' }}>
          <input
            type="checkbox"
            checked={customSelect}
            onChange={(e) => {
              setCustomSelect(e.target.checked);
              setSelectStart(null);
              setSelectEnd(null);
            }}
          />{' '}
          Free select (drag to pick custom region)
        </label>
        <span style={{ fontSize: 11, color: '#666' }}>
          Grid: {sheet.tileWidth}x{sheet.tileHeight} | {cols}x{rows} tiles
        </span>
      </div>
      <div style={{ border: '1px solid #333', background: '#1a1a2e' }}>
        <canvas
          ref={canvasRef}
          width={sheet.imageWidth * PICKER_ZOOM}
          height={sheet.imageHeight * PICKER_ZOOM}
          style={{
            display: 'block',
            cursor: customSelect ? 'crosshair' : 'pointer',
            width: '100%',
            height: 'auto',
            imageRendering: 'pixelated',
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setHover(null)}
        />
      </div>
    </div>
  );
};

export default SpriteSheetPicker;
