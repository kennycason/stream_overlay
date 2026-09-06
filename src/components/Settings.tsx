import React, { useState, useCallback, useRef } from 'react';
import {
  OverlayState,
  PanelConfig,
  SpriteSheet,
  BorderSkin,
  AspectRatio,
  createEmptyBorderSkin,
  getBorderThickness,
} from '../types';
import BorderEditor from './BorderEditor';
import SpriteBorder from './SpriteBorder';
import ColorPicker from './ColorPicker';
import { exportState, importState } from '../store';

type Tab = 'panels' | 'borders' | 'sprites' | 'export';

interface SettingsProps {
  state: OverlayState;
  selectedPanelId: string | null;
  onUpdateState: (state: OverlayState) => void;
  onSelectPanel: (id: string | null) => void;
  onClose: () => void;
  onScreenshot: () => void;
}

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9' },
  { value: '1:1', label: '1:1' },
];

let nextId = Date.now();
function genId(prefix: string) {
  return `${prefix}_${nextId++}`;
}

const Settings: React.FC<SettingsProps> = ({ state, selectedPanelId, onUpdateState, onSelectPanel, onClose, onScreenshot }) => {
  const [tab, setTab] = useState<Tab>('panels');
  const [editBorderId, setEditBorderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const updatePanels = useCallback((panels: PanelConfig[]) => {
    onUpdateState({ ...state, panels });
  }, [state, onUpdateState]);

  const updatePanel = useCallback((id: string, changes: Partial<PanelConfig>) => {
    onUpdateState({
      ...state,
      panels: state.panels.map(p => p.id === id ? { ...p, ...changes } : p),
    });
  }, [state, onUpdateState]);

  const addPanel = useCallback(() => {
    const id = genId('panel');
    const newPanel: PanelConfig = {
      id,
      label: `Panel ${state.panels.length + 1}`,
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      aspectRatio: 'free',
      borderSkinId: null,
      borderColor: '2px solid #333',
      borderBackgroundColor: '#000000',
      visible: true,
      zIndex: state.panels.length,
      backgroundColor: 'transparent',
      locked: false,
    };
    updatePanels([...state.panels, newPanel]);
    onSelectPanel(id);
  }, [state, updatePanels, onSelectPanel]);

  const removePanel = useCallback((id: string) => {
    updatePanels(state.panels.filter(p => p.id !== id));
    if (selectedPanelId === id) onSelectPanel(null);
  }, [state, updatePanels, selectedPanelId, onSelectPanel]);

  const duplicatePanel = useCallback((id: string) => {
    const source = state.panels.find(p => p.id === id);
    if (!source) return;
    const newId = genId('panel');
    const dup: PanelConfig = {
      ...source,
      id: newId,
      label: `${source.label} copy`,
      x: source.x + 20,
      y: source.y + 20,
      zIndex: state.panels.length,
    };
    updatePanels([...state.panels, dup]);
  }, [state, updatePanels]);

  // Sprite sheet upload
  const handleSpriteUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const id = genId('sheet');
        const sheet: SpriteSheet = {
          id,
          name: file.name.replace(/\.\w+$/, ''),
          dataUrl,
          tileWidth: 16,
          tileHeight: 16,
          imageWidth: img.width,
          imageHeight: img.height,
        };
        onUpdateState({ ...state, spriteSheets: [...state.spriteSheets, sheet] });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [state, onUpdateState]);

  const updateSheet = useCallback((id: string, changes: Partial<SpriteSheet>) => {
    onUpdateState({
      ...state,
      spriteSheets: state.spriteSheets.map(s => s.id === id ? { ...s, ...changes } : s),
    });
  }, [state, onUpdateState]);

  const removeSheet = useCallback((id: string) => {
    onUpdateState({
      ...state,
      spriteSheets: state.spriteSheets.filter(s => s.id !== id),
    });
  }, [state, onUpdateState]);

  // Border skins
  const addBorder = useCallback(() => {
    const id = genId('border');
    const skin = createEmptyBorderSkin(id, `Border ${state.borderSkins.length + 1}`);
    onUpdateState({ ...state, borderSkins: [...state.borderSkins, skin] });
    setEditBorderId(id);
  }, [state, onUpdateState]);

  const updateBorder = useCallback((skin: BorderSkin) => {
    onUpdateState({
      ...state,
      borderSkins: state.borderSkins.map(b => b.id === skin.id ? skin : b),
    });
  }, [state, onUpdateState]);

  const removeBorder = useCallback((id: string) => {
    onUpdateState({
      ...state,
      borderSkins: state.borderSkins.filter(b => b.id !== id),
      panels: state.panels.map(p => p.borderSkinId === id ? { ...p, borderSkinId: null } : p),
    });
    if (editBorderId === id) setEditBorderId(null);
  }, [state, onUpdateState, editBorderId]);

  const duplicateBorder = useCallback((id: string) => {
    const source = state.borderSkins.find(b => b.id === id);
    if (!source) return;
    const newId = genId('border');
    const dup: BorderSkin = { ...source, id: newId, name: `${source.name} copy` };
    onUpdateState({ ...state, borderSkins: [...state.borderSkins, dup] });
  }, [state, onUpdateState]);

  // Export / Import
  const handleExport = useCallback(() => {
    const json = exportState(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'overlay-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importState(reader.result as string);
      if (result) {
        onUpdateState(result);
      } else {
        alert('Invalid overlay config file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [onUpdateState]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset all settings to defaults? This cannot be undone.')) {
      const { DEFAULT_STATE } = require('../types');
      onUpdateState({ ...DEFAULT_STATE });
    }
  }, [onUpdateState]);

  const editingBorder = editBorderId ? state.borderSkins.find(b => b.id === editBorderId) : null;

  const inputStyle: React.CSSProperties = {
    background: '#222',
    border: '1px solid #444',
    color: '#fff',
    padding: '4px 8px',
    fontSize: 12,
  };
  const btnStyle: React.CSSProperties = {
    background: '#333',
    border: '1px solid #555',
    color: '#fff',
    padding: '4px 12px',
    fontSize: 12,
    cursor: 'pointer',
  };
  const btnDanger: React.CSSProperties = {
    ...btnStyle,
    background: '#500',
    border: '1px solid #a00',
  };
  const btnPrimary: React.CSSProperties = {
    ...btnStyle,
    background: '#060',
    border: '1px solid #0a0',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 820,
      height: '100vh',
      background: '#0d0d0d',
      borderLeft: '2px solid #333',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100000,
      fontFamily: 'monospace',
      color: '#ccc',
      fontSize: 13,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid #333',
        gap: 8,
      }}>
        <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: 14 }}>OVERLAY SETTINGS</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#888' }}>BG:</span>
          <ColorPicker
            value={state.canvasBackgroundColor}
            onChange={(c) => onUpdateState({ ...state, canvasBackgroundColor: c })}
            presets={[
              'transparent', '#000000', '#111111', '#1a1a2e',
              '#0d1117', '#1e293b', '#0a0a0a', '#222222',
              '#00ff00', '#ff00ff',
            ]}
          />
        </div>
        <label style={{ fontSize: 11, color: '#888' }}>
          <input
            type="checkbox"
            checked={state.showGrid}
            onChange={(e) => onUpdateState({ ...state, showGrid: e.target.checked })}
          /> Grid
        </label>
        <label style={{ fontSize: 11, color: '#888' }}>
          <input
            type="checkbox"
            checked={state.snapToGrid}
            onChange={(e) => onUpdateState({ ...state, snapToGrid: e.target.checked })}
          /> Snap
        </label>
        <input
          type="number"
          value={state.gridSize}
          min={4}
          max={64}
          onChange={(e) => onUpdateState({ ...state, gridSize: parseInt(e.target.value) || 16 })}
          style={{ ...inputStyle, width: 48 }}
          title="Grid size"
        />
        <button onClick={onScreenshot} style={{ ...btnPrimary, fontSize: 11 }}>Save PNG</button>
        <button onClick={onClose} style={{ ...btnStyle, fontWeight: 'bold' }}>ESC</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
        {(['panels', 'borders', 'sprites', 'export'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '8px 0',
              background: tab === t ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid #00ff88' : '2px solid transparent',
              color: tab === t ? '#00ff88' : '#666',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* PANELS TAB */}
        {tab === 'panels' && (
          <div>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <button onClick={addPanel} style={btnPrimary}>+ Add Panel</button>
            </div>
            {state.panels.map(panel => {
              const panelBorder = panel.borderSkinId ? state.borderSkins.find(b => b.id === panel.borderSkinId) : null;
              const isSelected = selectedPanelId === panel.id;
              const thumbBorder = getBorderThickness(panelBorder || null);
              // Thumbnail proportions
              const thumbW = 120;
              const thumbH = Math.round(thumbW * (panel.height / panel.width));
              // Extra margin for the outer border in the thumbnail
              const thumbMarginT = panelBorder ? Math.min(thumbBorder.top, 16) : 0;
              const thumbMarginR = panelBorder ? Math.min(thumbBorder.right, 16) : 0;
              const thumbMarginB = panelBorder ? Math.min(thumbBorder.bottom, 16) : 0;
              const thumbMarginL = panelBorder ? Math.min(thumbBorder.left, 16) : 0;

              return (
                <div
                  key={panel.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: isSelected ? 'rgba(0,255,136,0.05)' : '#111',
                    border: isSelected ? '1px solid #00ff88' : '1px solid #222',
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectPanel(panel.id)}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Panel thumbnail preview */}
                    <div style={{
                      width: thumbW,
                      height: Math.max(thumbH, 40),
                      flexShrink: 0,
                      position: 'relative',
                      background: panel.backgroundColor === 'transparent'
                        ? 'repeating-conic-gradient(#222 0% 25%, #1a1a1a 0% 50%) 50% / 10px 10px'
                        : panel.backgroundColor,
                      border: '1px solid #333',
                      overflow: 'visible',
                      margin: `${thumbMarginT}px ${thumbMarginR}px ${thumbMarginB}px ${thumbMarginL}px`,
                    }}>
                      {panelBorder && (
                        <SpriteBorder
                          skin={panelBorder}
                          spriteSheets={state.spriteSheets}
                          width={thumbW}
                          height={Math.max(thumbH, 40)}
                        />
                      )}
                      {!panelBorder && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, color: '#444',
                        }}>
                          no border
                        </div>
                      )}
                    </div>

                    {/* Panel info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <input
                          type="text"
                          value={panel.label}
                          onChange={(e) => updatePanel(panel.id, { label: e.target.value })}
                          style={{ ...inputStyle, flex: 1, fontWeight: 'bold' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button onClick={(e) => { e.stopPropagation(); duplicatePanel(panel.id); }} style={btnStyle}>Dup</button>
                        <button onClick={(e) => { e.stopPropagation(); removePanel(panel.id); }} style={btnDanger}>Del</button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: '#888' }}>
                        <span>{Math.round(panel.width)}x{Math.round(panel.height)}</span>
                        <span>@({Math.round(panel.x)},{Math.round(panel.y)})</span>
                        {panel.aspectRatio !== 'free' && <span style={{ color: '#00aa66' }}>[{panel.aspectRatio}]</span>}
                        {panelBorder && <span style={{ color: '#aa8800' }}>[{panelBorder.name}]</span>}
                        <div style={{ flex: 1 }} />
                        <label>
                          <input
                            type="checkbox"
                            checked={panel.visible}
                            onChange={(e) => updatePanel(panel.id, { visible: e.target.checked })}
                          /> Vis
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={panel.locked}
                            onChange={(e) => updatePanel(panel.id, { locked: e.target.checked })}
                          /> Lock
                        </label>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                      <div>
                        <label style={{ fontSize: 10, color: '#666' }}>X</label>
                        <input type="number" value={Math.round(panel.x)} onChange={(e) => updatePanel(panel.id, { x: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#666' }}>Y</label>
                        <input type="number" value={Math.round(panel.y)} onChange={(e) => updatePanel(panel.id, { y: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#666' }}>Width</label>
                        <input type="number" value={Math.round(panel.width)} onChange={(e) => updatePanel(panel.id, { width: parseInt(e.target.value) || 50 })} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#666' }}>Height</label>
                        <input type="number" value={Math.round(panel.height)} onChange={(e) => updatePanel(panel.id, { height: parseInt(e.target.value) || 50 })} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#666' }}>Aspect Ratio</label>
                        <select
                          value={panel.aspectRatio}
                          onChange={(e) => {
                            const ar = e.target.value as AspectRatio;
                            const changes: Partial<PanelConfig> = { aspectRatio: ar };
                            // Immediately enforce the ratio based on current width
                            const ratioMap: Record<string, number | null> = { 'free': null, '4:3': 4/3, '16:9': 16/9, '1:1': 1 };
                            const r = ratioMap[ar];
                            if (r) {
                              changes.height = Math.round(panel.width / r);
                            }
                            updatePanel(panel.id, changes);
                          }}
                          style={{ ...inputStyle, width: '100%' }}
                        >
                          {ASPECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#666' }}>Z-Index</label>
                        <input type="number" value={panel.zIndex} onChange={(e) => updatePanel(panel.id, { zIndex: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: 10, color: '#666' }}>Border Skin</label>
                        <select
                          value={panel.borderSkinId || ''}
                          onChange={(e) => updatePanel(panel.id, { borderSkinId: e.target.value || null })}
                          style={{ ...inputStyle, width: '100%', borderColor: panel.borderSkinId ? '#aa8800' : '#444' }}
                        >
                          <option value="">None</option>
                          {state.borderSkins.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 4', display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                          <ColorPicker
                            label="Panel BG"
                            value={panel.backgroundColor}
                            onChange={(c) => updatePanel(panel.id, { backgroundColor: c })}
                            presets={[
                              'transparent', '#000000', '#111111', '#222222', '#333333',
                              'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)',
                              '#1a1a2e', '#0d1117', '#1e293b',
                            ]}
                          />
                          <span style={{ fontSize: 10, color: '#666', paddingBottom: 2 }}>{panel.backgroundColor}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                          <ColorPicker
                            label="Border Line"
                            value={panel.borderColor || 'transparent'}
                            onChange={(c) => updatePanel(panel.id, { borderColor: c === 'transparent' ? 'none' : `2px solid ${c}` })}
                            allowTransparent={false}
                            presets={[
                              '#333333', '#555555', '#888888', '#ffffff',
                              '#00ff88', '#ff6600', '#0088ff', '#aa00ff',
                              '#4a8462', '#aa8800', '#ff0000',
                            ]}
                          />
                          <span style={{ fontSize: 10, color: '#666', paddingBottom: 2 }}>{panel.borderColor || 'none'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                          <ColorPicker
                            label="Border BG"
                            value={panel.borderBackgroundColor || 'transparent'}
                            onChange={(c) => updatePanel(panel.id, { borderBackgroundColor: c })}
                            presets={[
                              'transparent', '#000000', '#111111', '#1a1a2e',
                              '#0d1117', '#0a0a0a', '#222222', '#333333',
                            ]}
                          />
                          <span style={{ fontSize: 10, color: '#666', paddingBottom: 2 }}>{panel.borderBackgroundColor || 'transparent'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* BORDERS TAB */}
        {tab === 'borders' && (
          <div>
            {!editingBorder ? (
              <>
                <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                  <button onClick={addBorder} style={btnPrimary}>+ New Border Skin</button>
                </div>
                {state.borderSkins.length === 0 && (
                  <div style={{ color: '#555', padding: 20, textAlign: 'center' }}>
                    No border skins yet. Create one and assign sprite tiles to build a border frame.
                    {state.spriteSheets.length === 0 && (
                      <div style={{ marginTop: 8, color: '#aa6600' }}>
                        Upload a sprite sheet first in the "Sprites" tab.
                      </div>
                    )}
                  </div>
                )}
                {state.borderSkins.map(skin => {
                  const usedBy = state.panels.filter(p => p.borderSkinId === skin.id);
                  return (
                    <div
                      key={skin.id}
                      style={{ padding: 12, marginBottom: 8, background: '#111', border: '1px solid #222' }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ flex: 1, fontWeight: 'bold' }}>{skin.name}</span>
                        <span style={{ fontSize: 10, color: '#666' }}>scale: {skin.scale}x</span>
                        {usedBy.length > 0 && (
                          <span style={{ fontSize: 10, color: '#0a0' }}>
                            used by: {usedBy.map(p => p.label).join(', ')}
                          </span>
                        )}
                        <button onClick={() => setEditBorderId(skin.id)} style={btnStyle}>Edit</button>
                        <button onClick={() => duplicateBorder(skin.id)} style={btnStyle}>Dup</button>
                        <button onClick={() => removeBorder(skin.id)} style={btnDanger}>Del</button>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => setEditBorderId(null)} style={btnStyle}>&larr; Back</button>
                  <span style={{ color: '#00ff88' }}>Editing: {editingBorder.name}</span>
                </div>
                <BorderEditor
                  skin={editingBorder}
                  spriteSheets={state.spriteSheets}
                  onChange={updateBorder}
                />
              </>
            )}
          </div>
        )}

        {/* SPRITES TAB */}
        {tab === 'sprites' && (
          <div>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => fileInputRef.current?.click()} style={btnPrimary}>
                + Upload Sprite Sheet
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSpriteUpload}
                style={{ display: 'none' }}
              />
            </div>
            {state.spriteSheets.length === 0 && (
              <div style={{ color: '#555', padding: 20, textAlign: 'center' }}>
                No sprite sheets uploaded yet. Upload a PNG sprite sheet to start building borders.
              </div>
            )}
            {state.spriteSheets.map(sheet => (
              <div
                key={sheet.id}
                style={{ padding: 12, marginBottom: 8, background: '#111', border: '1px solid #222' }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    type="text"
                    value={sheet.name}
                    onChange={(e) => updateSheet(sheet.id, { name: e.target.value })}
                    style={{ ...inputStyle, flex: 1, fontWeight: 'bold' }}
                  />
                  <span style={{ fontSize: 10, color: '#666' }}>
                    {sheet.imageWidth}x{sheet.imageHeight}px
                  </span>
                  <button onClick={() => removeSheet(sheet.id)} style={btnDanger}>Del</button>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: 10, color: '#666' }}>Tile W</label>
                    <input
                      type="number"
                      value={sheet.tileWidth}
                      min={1}
                      onChange={(e) => updateSheet(sheet.id, { tileWidth: parseInt(e.target.value) || 8 })}
                      style={{ ...inputStyle, width: 60 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#666' }}>Tile H</label>
                    <input
                      type="number"
                      value={sheet.tileHeight}
                      min={1}
                      onChange={(e) => updateSheet(sheet.id, { tileHeight: parseInt(e.target.value) || 8 })}
                      style={{ ...inputStyle, width: 60 }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8, overflow: 'auto', maxHeight: 200, border: '1px solid #222' }}>
                  <img
                    src={sheet.dataUrl}
                    alt={sheet.name}
                    style={{ imageRendering: 'pixelated', maxWidth: 600, height: 'auto' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EXPORT TAB */}
        {tab === 'export' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Export / Import Configuration</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleExport} style={btnPrimary}>Export Config</button>
                <button onClick={() => importInputRef.current?.click()} style={btnStyle}>Import Config</button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
                <button onClick={handleReset} style={btnDanger}>Reset to Defaults</button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Current Config (JSON)</div>
              <textarea
                readOnly
                value={exportState(state)}
                style={{
                  width: '100%',
                  height: 400,
                  background: '#111',
                  border: '1px solid #333',
                  color: '#888',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  resize: 'vertical',
                  padding: 8,
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#555' }}>
              <p>Tip: The config is auto-saved to localStorage on every change.</p>
              <p>Export to back up your layout, or share configs between machines.</p>
              <p>Sprite sheet images are embedded as base64 in the config.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
