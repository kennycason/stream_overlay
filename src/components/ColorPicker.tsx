import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  presets?: string[];
  allowTransparent?: boolean;
}

const DEFAULT_PRESETS = [
  '#000000', '#ffffff', '#333333', '#555555', '#888888',
  '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
  '#00ff88', '#ff6600', '#aa00ff', '#0088ff',
];

function parseToHexAndAlpha(css: string): { hex: string; alpha: number } {
  if (css === 'transparent') return { hex: '#000000', alpha: 0 };

  // rgba(r,g,b,a)
  const rgbaMatch = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    return { hex, alpha: a };
  }

  // hex
  if (css.startsWith('#')) {
    let hex = css;
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return { hex: hex.slice(0, 7), alpha: 1 };
  }

  return { hex: '#000000', alpha: 1 };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (alpha >= 1) return hex;
  if (alpha <= 0) return 'transparent';
  return `rgba(${r},${g},${b},${alpha})`;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
  presets = DEFAULT_PRESETS,
  allowTransparent = true,
}) => {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const { hex, alpha } = parseToHexAndAlpha(value);
  const isTransparent = value === 'transparent' || alpha <= 0;

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      popupRef.current && !popupRef.current.contains(e.target as Node) &&
      triggerRef.current && !triggerRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const handleHexChange = (newHex: string) => {
    onChange(hexToRgba(newHex, alpha));
  };

  const handleAlphaChange = (newAlpha: number) => {
    onChange(hexToRgba(hex, newAlpha));
  };

  const checkerBg = 'repeating-conic-gradient(#444 0% 25%, #333 0% 50%) 50% / 8px 8px';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {label && <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 2 }}>{label}</label>}
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        style={{
          width: 32,
          height: 20,
          border: '2px solid #555',
          cursor: 'pointer',
          background: isTransparent ? checkerBg : value,
          borderRadius: 3,
        }}
        title={value}
      />
      {open && (
        <div
          ref={popupRef}
          style={{
            position: 'absolute',
            top: label ? 40 : 26,
            left: 0,
            zIndex: 200000,
            background: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: 4,
            padding: 10,
            width: 220,
            boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
          }}
        >
          {/* Current value display */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28,
              border: '1px solid #555',
              borderRadius: 3,
              background: isTransparent ? checkerBg : value,
              flexShrink: 0,
            }} />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{
                flex: 1,
                background: '#222',
                border: '1px solid #444',
                color: '#fff',
                padding: '3px 6px',
                fontSize: 11,
                fontFamily: 'monospace',
                borderRadius: 2,
              }}
            />
          </div>

          {/* Native color input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              type="color"
              value={hex}
              onChange={(e) => handleHexChange(e.target.value)}
              style={{
                width: 40,
                height: 28,
                padding: 0,
                border: '1px solid #555',
                background: 'none',
                cursor: 'pointer',
                borderRadius: 2,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#666', marginBottom: 2 }}>Opacity: {Math.round(alpha * 100)}%</div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(alpha * 100)}
                onChange={(e) => handleAlphaChange(parseInt(e.target.value) / 100)}
                style={{ width: '100%', height: 14, cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Transparent button */}
          {allowTransparent && (
            <button
              onClick={() => onChange('transparent')}
              style={{
                width: '100%',
                padding: '4px 0',
                marginBottom: 8,
                background: isTransparent ? '#0a3322' : '#222',
                border: isTransparent ? '1px solid #00ff88' : '1px solid #444',
                color: isTransparent ? '#00ff88' : '#888',
                fontSize: 11,
                fontFamily: 'monospace',
                cursor: 'pointer',
                borderRadius: 2,
              }}
            >
              Transparent
            </button>
          )}

          {/* Preset swatches */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {presets.map(color => (
              <div
                key={color}
                onClick={() => onChange(color)}
                style={{
                  width: 18,
                  height: 18,
                  background: color,
                  border: value === color ? '2px solid #00ff88' : '1px solid #555',
                  cursor: 'pointer',
                  borderRadius: 2,
                }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
