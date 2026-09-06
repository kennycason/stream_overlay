import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { OverlayState, PanelConfig, BorderSkin, getBorderThickness } from './types';
import { loadState, saveState } from './store';
import Panel, { SnapTarget } from './components/Panel';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [state, setState] = useState<OverlayState>(() => loadState());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const canvasRef = useRef<HTMLDivElement>(null);

  // Auto-save on state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setSettingsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else {
          setSelectedPanelId(null);
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (settingsOpen && selectedPanelId) {
          setState(prev => ({
            ...prev,
            panels: prev.panels.filter(p => p.id !== selectedPanelId),
          }));
          setSelectedPanelId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [settingsOpen, selectedPanelId]);

  const handleUpdatePanel = useCallback((id: string, changes: Partial<PanelConfig>) => {
    setState(prev => ({
      ...prev,
      panels: prev.panels.map(p => p.id === id ? { ...p, ...changes } : p),
    }));
  }, []);

  const handleBringToFront = useCallback((id: string) => {
    setState(prev => {
      const maxZ = Math.max(...prev.panels.map(p => p.zIndex));
      return {
        ...prev,
        panels: prev.panels.map(p => p.id === id ? { ...p, zIndex: maxZ + 1 } : p),
      };
    });
  }, []);

  const handleUpdateState = useCallback((newState: OverlayState) => {
    setState(newState);
  }, []);

  const handleScreenshot = useCallback(async () => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    // Temporarily hide settings-mode UI elements during capture
    const settingsEls = canvasEl.querySelectorAll<HTMLElement>('[data-settings-ui]');
    settingsEls.forEach(el => { el.style.display = 'none'; });

    // Remove settings-mode outline/background from canvas and panels
    const root = canvasEl.parentElement;
    root?.classList.remove('settings-active');
    canvasEl.style.backgroundColor = state.canvasBackgroundColor;

    // Remove panel outlines during capture
    const panelEls = canvasEl.querySelectorAll<HTMLElement>('[style*="outline"]');
    const savedOutlines: string[] = [];
    panelEls.forEach(el => {
      savedOutlines.push(el.style.outline);
      el.style.outline = 'none';
    });

    try {
      const canvas = await (html2canvas as any)(canvasEl, {
        backgroundColor: null,
        width: state.canvasWidth,
        height: state.canvasHeight,
        scale: 1,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `overlay-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } finally {
      settingsEls.forEach(el => { el.style.display = ''; });
      root?.classList.add('settings-active');
      canvasEl.style.backgroundColor = '';
      panelEls.forEach((el, i) => { el.style.outline = savedOutlines[i]; });
    }
  }, [state.canvasWidth, state.canvasHeight, state.canvasBackgroundColor]);

  const borderSkinMap = new Map<string, BorderSkin>();
  state.borderSkins.forEach(b => borderSkinMap.set(b.id, b));

  const snapTargetsMap = useMemo(() => {
    const map: Record<string, SnapTarget[]> = {};
    const allTargets: SnapTarget[] = state.panels
      .filter(p => p.visible)
      .map(p => {
        const skin = p.borderSkinId ? borderSkinMap.get(p.borderSkinId) || null : null;
        const b = getBorderThickness(skin);
        return {
          id: p.id,
          outerLeft: p.x - b.left,
          outerTop: p.y - b.top,
          outerRight: p.x + p.width + b.right,
          outerBottom: p.y + p.height + b.bottom,
        };
      });
    for (const panel of state.panels) {
      map[panel.id] = allTargets.filter(t => t.id !== panel.id);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.panels, state.borderSkins]);

  return (
    <div className={`overlay-root${settingsOpen ? ' settings-active' : ''}`}>
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="overlay-canvas"
        style={{
          width: state.canvasWidth,
          height: state.canvasHeight,
          backgroundColor: !settingsOpen ? state.canvasBackgroundColor : undefined,
        }}
        onClick={() => {
          if (settingsOpen) setSelectedPanelId(null);
        }}
      >
        {/* Grid overlay */}
        {settingsOpen && state.showGrid && (
          <div
            className="overlay-grid"
            style={{
              backgroundSize: `${state.gridSize}px ${state.gridSize}px`,
            }}
          />
        )}

        {/* Panels */}
        {state.panels.map(panel => (
          <Panel
            key={panel.id}
            panel={panel}
            borderSkin={panel.borderSkinId ? borderSkinMap.get(panel.borderSkinId) || null : null}
            spriteSheets={state.spriteSheets}
            settingsMode={settingsOpen}
            selected={selectedPanelId === panel.id}
            snapToGrid={state.snapToGrid}
            gridSize={state.gridSize}
            canvasWidth={state.canvasWidth}
            canvasHeight={state.canvasHeight}
            snapTargets={snapTargetsMap[panel.id] || []}
            onUpdate={handleUpdatePanel}
            onSelect={setSelectedPanelId}
            onBringToFront={handleBringToFront}
          />
        ))}

        {/* Settings mode indicator */}
        {settingsOpen && (
          <div className="settings-indicator" data-settings-ui>
            SETTINGS MODE — press S or ESC to close
          </div>
        )}

        {/* Hint when not in settings */}
        {!settingsOpen && (
          <div className="hint-indicator">
            Press S for settings
          </div>
        )}
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <Settings
          state={state}
          selectedPanelId={selectedPanelId}
          onUpdateState={handleUpdateState}
          onSelectPanel={setSelectedPanelId}
          onClose={() => setSettingsOpen(false)}
          onScreenshot={handleScreenshot}
        />
      )}
    </div>
  );
}

export default App;
