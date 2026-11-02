import React, { useState, useCallback } from 'react';
import { BorderSkin, BorderTile, SpriteSheet, SpriteRegion, EdgeFitMode, createEmptyBorderTile } from '../types';
import SpriteSheetPicker from './SpriteSheetPicker';
import SpriteBorder from './SpriteBorder';

type SlotName = 'topLeft' | 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left';

const SLOT_LABELS: Record<SlotName, string> = {
  topLeft: 'TL Corner',
  top: 'Top Edge',
  topRight: 'TR Corner',
  right: 'Right Edge',
  bottomRight: 'BR Corner',
  bottom: 'Bottom Edge',
  bottomLeft: 'BL Corner',
  left: 'Left Edge',
};

const SLOT_GRID: SlotName[][] = [
  ['topLeft', 'top', 'topRight'],
  ['left', null as any, 'right'],
  ['bottomLeft', 'bottom', 'bottomRight'],
];

interface BorderEditorProps {
  skin: BorderSkin;
  spriteSheets: SpriteSheet[];
  onChange: (skin: BorderSkin) => void;
}

interface TilePreviewProps {
  tile: BorderTile | null;
  sheet: SpriteSheet | undefined;
  scale: number;
  label: string;
  selected: boolean;
  onClick: () => void;
}

const TilePreview: React.FC<TilePreviewProps> = ({ tile, sheet, scale, label, selected, onClick }) => {
  const size = 52;

  const renderTile = () => {
    if (!tile || !sheet) {
      return (
        <div style={{
          width: size, height: size,
          border: '2px dashed #444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#555', textAlign: 'center',
        }}>
          Empty
        </div>
      );
    }

    const previewScale = Math.min(size / tile.region.width, size / tile.region.height);
    const transforms: string[] = [];
    if (tile.flipH) transforms.push('scaleX(-1)');
    if (tile.flipV) transforms.push('scaleY(-1)');
    if (tile.rotation !== 0) transforms.push(`rotate(${tile.rotation}deg)`);

    return (
      <div style={{
        width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          width: tile.region.width * previewScale,
          height: tile.region.height * previewScale,
          backgroundImage: `url(${sheet.dataUrl})`,
          backgroundPosition: `-${tile.region.x * previewScale}px -${tile.region.y * previewScale}px`,
          backgroundSize: `${sheet.imageWidth * previewScale}px ${sheet.imageHeight * previewScale}px`,
          imageRendering: 'pixelated',
          transform: transforms.join(' '),
        }} />
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        border: selected ? '2px solid #00ff88' : '2px solid #333',
        background: selected ? 'rgba(0,255,136,0.1)' : '#111',
        padding: 3,
        textAlign: 'center',
      }}
    >
      {renderTile()}
      <div style={{ fontSize: 8, color: '#888', marginTop: 1 }}>{label}</div>
    </div>
  );
};

const BorderEditor: React.FC<BorderEditorProps> = ({ skin, spriteSheets, onChange }) => {
  const [activeSlot, setActiveSlot] = useState<SlotName | null>(null);
  const [activeSheetId, setActiveSheetId] = useState<string>(spriteSheets[0]?.id || '');
  const [selectedTile, setSelectedTile] = useState<{ spriteSheetId: string; region: SpriteRegion } | null>(null);

  const activeSheet = spriteSheets.find(s => s.id === activeSheetId);
  const activeTile = activeSlot ? skin[activeSlot] : null;

  const assignTileToSlot = useCallback((slot: SlotName, spriteSheetId: string, region: SpriteRegion) => {
    const existing = skin[slot];
    const newTile: BorderTile = existing
      ? { ...existing, region, spriteSheetId }
      : createEmptyBorderTile(spriteSheetId, region);
    onChange({ ...skin, [slot]: newTile });
  }, [skin, onChange]);

  const handleSelectRegion = useCallback((region: SpriteRegion) => {
    if (!activeSheetId) return;
    setSelectedTile({ spriteSheetId: activeSheetId, region });
    if (activeSlot) assignTileToSlot(activeSlot, activeSheetId, region);
  }, [activeSlot, activeSheetId, assignTileToSlot]);

  const handleSlotClick = useCallback((slot: SlotName) => {
    if (selectedTile) {
      setActiveSlot(slot);
      assignTileToSlot(slot, selectedTile.spriteSheetId, selectedTile.region);
      return;
    }
    setActiveSlot(activeSlot === slot ? null : slot);
  }, [activeSlot, selectedTile, assignTileToSlot]);

  const updateTileProperty = useCallback((prop: keyof BorderTile, value: any) => {
    if (!activeSlot || !skin[activeSlot]) return;
    onChange({
      ...skin,
      [activeSlot]: { ...skin[activeSlot]!, [prop]: value },
    });
  }, [activeSlot, skin, onChange]);

  const clearSlot = useCallback(() => {
    if (!activeSlot) return;
    onChange({ ...skin, [activeSlot]: null });
  }, [activeSlot, skin, onChange]);

  const previewWidth = 240;
  const previewHeight = 160;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Border name + scale + fit mode */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: '#aaa' }}>Name:</label>
        <input
          type="text"
          value={skin.name}
          onChange={(e) => onChange({ ...skin, name: e.target.value })}
          style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '4px 8px', flex: 1, minWidth: 100 }}
        />
        <label style={{ fontSize: 12, color: '#aaa' }}>Scale:</label>
        <input
          type="number"
          value={skin.scale}
          min={1}
          max={8}
          step={1}
          onChange={(e) => onChange({ ...skin, scale: Math.max(1, parseInt(e.target.value) || 1) })}
          style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '4px 8px', width: 50 }}
        />
        <label style={{ fontSize: 12, color: '#aaa' }}>Edges:</label>
        <select
          value={skin.edgeFitMode || 'fit'}
          onChange={(e) => onChange({ ...skin, edgeFitMode: e.target.value as EdgeFitMode })}
          style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '4px 8px', fontSize: 12 }}
        >
          <option value="fit">Fit (stretch/compress)</option>
          <option value="clip">Clip (cut off)</option>
        </select>
      </div>

      {/* Border controls stay above the potentially tall sprite sheet. */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* 9-slice grid */}
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Tile Slots</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: 3 }}>
            {SLOT_GRID.flat().map((slot, i) => {
              if (!slot) {
                return (
                  <div key={i} style={{
                    width: 64, height: 68,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#0a0a0a', border: '1px solid #222',
                    fontSize: 9, color: '#333',
                  }}>
                    Content
                  </div>
                );
              }
              return (
                <TilePreview
                  key={slot}
                  tile={skin[slot]}
                  sheet={skin[slot] ? spriteSheets.find(s => s.id === skin[slot]!.spriteSheetId) : undefined}
                  scale={skin.scale}
                  label={SLOT_LABELS[slot]}
                  selected={activeSlot === slot}
                  onClick={() => handleSlotClick(slot)}
                />
              );
            })}
          </div>
        </div>

        {/* Tile controls — fixed height area so layout doesn't shift */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Tile Settings</div>
          <div style={{ padding: 8, background: '#111', border: '1px solid #222', minHeight: 100 }}>
            {activeSlot && activeTile ? (
              <>
                <div style={{ fontSize: 11, color: '#00ff88', marginBottom: 8 }}>
                  {SLOT_LABELS[activeSlot]} — {activeTile.region.width}x{activeTile.region.height}px
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <label style={{ fontSize: 11, color: '#aaa' }}>
                    <input type="checkbox" checked={activeTile.flipH} onChange={(e) => updateTileProperty('flipH', e.target.checked)} /> H
                  </label>
                  <label style={{ fontSize: 11, color: '#aaa' }}>
                    <input type="checkbox" checked={activeTile.flipV} onChange={(e) => updateTileProperty('flipV', e.target.checked)} /> V
                  </label>
                  <select
                    value={activeTile.rotation}
                    onChange={(e) => updateTileProperty('rotation', parseInt(e.target.value) as 0 | 90 | 180 | 270)}
                    style={{ background: '#222', border: '1px solid #444', color: '#fff', fontSize: 11, width: 50 }}
                  >
                    <option value={0}>0°</option>
                    <option value={90}>90°</option>
                    <option value={180}>180°</option>
                    <option value={270}>270°</option>
                  </select>
                  <button
                    onClick={clearSlot}
                    style={{ background: '#600', border: '1px solid #a00', color: '#fff', padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                </div>
              </>
            ) : activeSlot ? (
              <div style={{ fontSize: 11, color: '#666' }}>
                Click a tile below to assign to "{SLOT_LABELS[activeSlot]}"
              </div>
            ) : selectedTile ? (
              <div style={{ fontSize: 11, color: '#00ff88' }}>
                Click a slot to place the selected tile
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#444' }}>
                Select a tile below or click a slot to start editing
              </div>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Preview</div>
          <div style={{
            width: previewWidth,
            height: previewHeight,
            position: 'relative',
            background: 'repeating-conic-gradient(#222 0% 25%, #1a1a1a 0% 50%) 50% / 16px 16px',
            border: '1px solid #333',
            overflow: 'visible',
          }}>
            <SpriteBorder skin={skin} spriteSheets={spriteSheets} width={previewWidth} height={previewHeight} />
          </div>
        </div>
      </div>

      {/* Sprite sheet picker — full width so tile details remain easy to inspect. */}
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#aaa' }}>
            {selectedTile
              ? `Selected tile: ${selectedTile.region.width}x${selectedTile.region.height}px — click a border slot above to place it`
              : activeSlot
                ? `Pick tile for: ${SLOT_LABELS[activeSlot]}`
                : 'Pick a tile, then click a border slot above'}
          </span>
          {spriteSheets.length > 1 && (
            <>
              <div style={{ flex: 1 }} />
              <label style={{ fontSize: 12, color: '#aaa' }}>Sheet: </label>
              <select
                value={activeSheetId}
                onChange={(e) => {
                  setActiveSheetId(e.target.value);
                  setSelectedTile(null);
                }}
                style={{ background: '#222', border: '1px solid #444', color: '#fff', fontSize: 12 }}
              >
                {spriteSheets.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
        {activeSheet ? (
          <SpriteSheetPicker
            sheet={activeSheet}
            onSelectRegion={handleSelectRegion}
            selectedRegion={selectedTile?.spriteSheetId === activeSheetId ? selectedTile.region : null}
          />
        ) : (
          <div style={{ color: '#666', fontSize: 12, padding: 20, background: '#111', border: '1px solid #222', textAlign: 'center' }}>
            No sprite sheets uploaded. Upload one in the Sprite Sheets tab.
          </div>
        )}
      </div>
    </div>
  );
};

export default BorderEditor;
