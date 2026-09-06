import React, { useMemo } from 'react';
import { BorderSkin, BorderTile, SpriteSheet, getBorderThickness } from '../types';

interface SpriteBorderProps {
  skin: BorderSkin;
  spriteSheets: SpriteSheet[];
  width: number;  // content area width
  height: number; // content area height
  borderBackgroundColor?: string;
}

function getTileTransform(tile: BorderTile): string {
  const transforms: string[] = [];
  if (tile.flipH) transforms.push('scaleX(-1)');
  if (tile.flipV) transforms.push('scaleY(-1)');
  if (tile.rotation !== 0) transforms.push(`rotate(${tile.rotation}deg)`);
  return transforms.join(' ');
}

interface TileRendererProps {
  tile: BorderTile;
  sheet: SpriteSheet;
  scale: number;
  style: React.CSSProperties;
}

const TileRenderer: React.FC<TileRendererProps> = ({ tile, sheet, scale, style }) => {
  const scaledW = tile.region.width * scale;
  const scaledH = tile.region.height * scale;
  const transform = getTileTransform(tile);

  return (
    <div
      style={{
        ...style,
        width: scaledW,
        height: scaledH,
        backgroundImage: `url(${sheet.dataUrl})`,
        backgroundPosition: `-${tile.region.x * scale}px -${tile.region.y * scale}px`,
        backgroundSize: `${sheet.imageWidth * scale}px ${sheet.imageHeight * scale}px`,
        imageRendering: 'pixelated',
        transform,
        overflow: 'hidden',
      }}
    />
  );
};

const SpriteBorder: React.FC<SpriteBorderProps> = ({ skin, spriteSheets, width, height, borderBackgroundColor }) => {
  const sheetMap = useMemo(() => {
    const map: Record<string, SpriteSheet> = {};
    spriteSheets.forEach(s => { map[s.id] = s; });
    return map;
  }, [spriteSheets]);

  const { scale } = skin;
  const fitMode = skin.edgeFitMode || 'fit';
  const thickness = getBorderThickness(skin);

  const outerW = width + thickness.left + thickness.right;
  const outerH = height + thickness.top + thickness.bottom;

  // Corner dimensions
  const tlW = skin.topLeft ? skin.topLeft.region.width * scale : 0;
  const tlH = skin.topLeft ? skin.topLeft.region.height * scale : 0;
  const trW = skin.topRight ? skin.topRight.region.width * scale : 0;
  const trH = skin.topRight ? skin.topRight.region.height * scale : 0;
  const blW = skin.bottomLeft ? skin.bottomLeft.region.width * scale : 0;
  const blH = skin.bottomLeft ? skin.bottomLeft.region.height * scale : 0;
  const brW = skin.bottomRight ? skin.bottomRight.region.width * scale : 0;
  const brH = skin.bottomRight ? skin.bottomRight.region.height * scale : 0;

  const renderTiledEdge = (
    tile: BorderTile,
    sheet: SpriteSheet,
    direction: 'horizontal' | 'vertical',
    length: number,
    style: React.CSSProperties,
  ) => {
    const tileW = tile.region.width * scale;
    const tileH = tile.region.height * scale;
    const naturalTileSize = direction === 'horizontal' ? tileW : tileH;
    const transform = getTileTransform(tile);

    if (fitMode === 'fit' && naturalTileSize > 0 && length > 0) {
      // Calculate how many tiles fit, pick whichever of floor/ceil distorts less
      const exactCount = length / naturalTileSize;
      const floorCount = Math.max(1, Math.floor(exactCount));
      const ceilCount = Math.ceil(exactCount);

      const floorSize = length / floorCount;
      const ceilSize = ceilCount > 0 ? length / ceilCount : naturalTileSize;

      // Pick whichever is closer to the natural size (less distortion)
      const floorDistortion = Math.abs(floorSize - naturalTileSize) / naturalTileSize;
      const ceilDistortion = Math.abs(ceilSize - naturalTileSize) / naturalTileSize;

      const count = floorDistortion <= ceilDistortion ? floorCount : ceilCount;
      const fittedSize = length / count;

      const isHorizontal = direction === 'horizontal';

      return (
        <div
          style={{
            ...style,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: isHorizontal ? 'row' : 'column',
            width: isHorizontal ? length : tileW,
            height: isHorizontal ? tileH : length,
          }}
        >
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: isHorizontal ? fittedSize : tileW,
                height: isHorizontal ? tileH : fittedSize,
                backgroundImage: `url(${sheet.dataUrl})`,
                backgroundPosition: `-${tile.region.x * scale}px -${tile.region.y * scale}px`,
                backgroundSize: `${sheet.imageWidth * scale}px ${sheet.imageHeight * scale}px`,
                imageRendering: 'pixelated',
                transform,
              }}
            />
          ))}
        </div>
      );
    }

    // Clip mode — just tile and overflow hidden
    const count = Math.ceil(length / naturalTileSize);
    return (
      <div
        style={{
          ...style,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          width: direction === 'horizontal' ? length : tileW,
          height: direction === 'horizontal' ? tileH : length,
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: tileW,
              height: tileH,
              backgroundImage: `url(${sheet.dataUrl})`,
              backgroundPosition: `-${tile.region.x * scale}px -${tile.region.y * scale}px`,
              backgroundSize: `${sheet.imageWidth * scale}px ${sheet.imageHeight * scale}px`,
              imageRendering: 'pixelated',
              transform,
            }}
          />
        ))}
      </div>
    );
  };

  // Edge spans (between corners, along the outer frame)
  const topEdgeSpan = outerW - tlW - trW;
  const bottomEdgeSpan = outerW - blW - brW;
  const leftEdgeSpan = outerH - tlH - blH;
  const rightEdgeSpan = outerH - trH - brH;

  return (
    <div style={{
      position: 'absolute',
      left: -thickness.left,
      top: -thickness.top,
      width: outerW,
      height: outerH,
      pointerEvents: 'none',
      overflow: 'visible',
    }}>
      {/* Border background — fills the frame area behind tiles */}
      {borderBackgroundColor && borderBackgroundColor !== 'transparent' && (
        <>
          {/* Top strip */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: outerW, height: thickness.top, background: borderBackgroundColor }} />
          {/* Bottom strip */}
          <div style={{ position: 'absolute', left: 0, bottom: 0, width: outerW, height: thickness.bottom, background: borderBackgroundColor }} />
          {/* Left strip (between top and bottom) */}
          <div style={{ position: 'absolute', left: 0, top: thickness.top, width: thickness.left, height: outerH - thickness.top - thickness.bottom, background: borderBackgroundColor }} />
          {/* Right strip (between top and bottom) */}
          <div style={{ position: 'absolute', right: 0, top: thickness.top, width: thickness.right, height: outerH - thickness.top - thickness.bottom, background: borderBackgroundColor }} />
        </>
      )}

      {/* Top edge */}
      {skin.top && sheetMap[skin.top.spriteSheetId] && topEdgeSpan > 0 &&
        renderTiledEdge(skin.top, sheetMap[skin.top.spriteSheetId], 'horizontal', topEdgeSpan, {
          position: 'absolute',
          left: tlW,
          top: 0,
        })
      }

      {/* Bottom edge */}
      {skin.bottom && sheetMap[skin.bottom.spriteSheetId] && bottomEdgeSpan > 0 &&
        renderTiledEdge(skin.bottom, sheetMap[skin.bottom.spriteSheetId], 'horizontal', bottomEdgeSpan, {
          position: 'absolute',
          left: blW,
          bottom: 0,
        })
      }

      {/* Left edge */}
      {skin.left && sheetMap[skin.left.spriteSheetId] && leftEdgeSpan > 0 &&
        renderTiledEdge(skin.left, sheetMap[skin.left.spriteSheetId], 'vertical', leftEdgeSpan, {
          position: 'absolute',
          left: 0,
          top: tlH,
        })
      }

      {/* Right edge */}
      {skin.right && sheetMap[skin.right.spriteSheetId] && rightEdgeSpan > 0 &&
        renderTiledEdge(skin.right, sheetMap[skin.right.spriteSheetId], 'vertical', rightEdgeSpan, {
          position: 'absolute',
          right: 0,
          top: trH,
        })
      }

      {/* Corners drawn LAST so they sit on top */}
      {skin.topLeft && sheetMap[skin.topLeft.spriteSheetId] && (
        <TileRenderer
          tile={skin.topLeft}
          sheet={sheetMap[skin.topLeft.spriteSheetId]}
          scale={scale}
          style={{ position: 'absolute', left: 0, top: 0 }}
        />
      )}
      {skin.topRight && sheetMap[skin.topRight.spriteSheetId] && (
        <TileRenderer
          tile={skin.topRight}
          sheet={sheetMap[skin.topRight.spriteSheetId]}
          scale={scale}
          style={{ position: 'absolute', right: 0, top: 0 }}
        />
      )}
      {skin.bottomLeft && sheetMap[skin.bottomLeft.spriteSheetId] && (
        <TileRenderer
          tile={skin.bottomLeft}
          sheet={sheetMap[skin.bottomLeft.spriteSheetId]}
          scale={scale}
          style={{ position: 'absolute', left: 0, bottom: 0 }}
        />
      )}
      {skin.bottomRight && sheetMap[skin.bottomRight.spriteSheetId] && (
        <TileRenderer
          tile={skin.bottomRight}
          sheet={sheetMap[skin.bottomRight.spriteSheetId]}
          scale={scale}
          style={{ position: 'absolute', right: 0, bottom: 0 }}
        />
      )}
    </div>
  );
};

export default SpriteBorder;
