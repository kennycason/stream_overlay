import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BorderEditor from './BorderEditor';
import { BorderSkin, createEmptyBorderSkin, SpriteSheet } from '../types';

jest.mock('./SpriteSheetPicker', () => ({ onSelectRegion }: { onSelectRegion: (region: { x: number; y: number; width: number; height: number }) => void }) => (
  <button onClick={() => onSelectRegion({ x: 16, y: 32, width: 16, height: 16 })}>
    Select sprite tile
  </button>
));

jest.mock('./SpriteBorder', () => () => <div>Border preview</div>);

const spriteSheet: SpriteSheet = {
  id: 'sheet-1',
  name: 'Test sheet',
  dataUrl: 'data:image/png;base64,test',
  tileWidth: 16,
  tileHeight: 16,
  imageWidth: 64,
  imageHeight: 64,
};

const BorderEditorHarness = () => {
  const [skin, setSkin] = useState<BorderSkin>(() => createEmptyBorderSkin('border-1', 'Test border'));

  return (
    <>
      <BorderEditor skin={skin} spriteSheets={[spriteSheet]} onChange={setSkin} />
      <output data-testid="skin-state">{JSON.stringify(skin)}</output>
    </>
  );
};

test('shows the border controls before the sprite sheet picker', () => {
  render(<BorderEditorHarness />);

  const slots = screen.getByText('Tile Slots');
  const picker = screen.getByRole('button', { name: 'Select sprite tile' });

  expect(slots.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('places the current sprite tile into every clicked border slot', () => {
  render(<BorderEditorHarness />);

  fireEvent.click(screen.getByRole('button', { name: 'Select sprite tile' }));
  fireEvent.click(screen.getByText('TL Corner'));
  fireEvent.click(screen.getByText('Right Edge'));

  const skin = JSON.parse(screen.getByTestId('skin-state').textContent || '{}') as BorderSkin;
  expect(skin.topLeft).toMatchObject({
    spriteSheetId: 'sheet-1',
    region: { x: 16, y: 32, width: 16, height: 16 },
  });
  expect(skin.right).toMatchObject({
    spriteSheetId: 'sheet-1',
    region: { x: 16, y: 32, width: 16, height: 16 },
  });
});

test('still assigns a tile when the border slot is selected first', () => {
  render(<BorderEditorHarness />);

  fireEvent.click(screen.getByText('Bottom Edge'));
  fireEvent.click(screen.getByRole('button', { name: 'Select sprite tile' }));

  const skin = JSON.parse(screen.getByTestId('skin-state').textContent || '{}') as BorderSkin;
  expect(skin.bottom).toMatchObject({
    spriteSheetId: 'sheet-1',
    region: { x: 16, y: 32, width: 16, height: 16 },
  });
});
