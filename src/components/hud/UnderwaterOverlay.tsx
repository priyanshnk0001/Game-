import React from 'react';
import { useGameState } from '../../hooks/useGameState';

/**
 * UnderwaterOverlay
 * Subtle, non-intrusive HUD enhancement for when the active player is submerged.
 * Note: Does NOT render full-screen blue tints or artificial filters —
 * the 3D WaterSystem handles realistic underwater depth and atmospheric fog.
 */
export const UnderwaterOverlay: React.FC = () => {
  const state = useGameState();
  const player = state.players[state.activePlayerId];

  const waterState = player?.waterState ?? 'land';
  const isUnderwater = waterState === 'underwater';
  const isSurface = waterState === 'surface';
  const swimDepth = player?.swimDepth ?? (isUnderwater ? 1.1 : 0.0);

  if (!isUnderwater && !isSurface) return null;

  return (
    <>
      {/* 1. Clear tropical freshwater blue-green/teal water depth transmission (Reference 1 & 2) */}
      {isUnderwater && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 140,
            pointerEvents: 'none',
            // Luminous tropical blue-green / teal freshwater transmission
            background: 'linear-gradient(180deg, rgba(25, 175, 185, 0.12) 0%, rgba(12, 120, 132, 0.20) 45%, rgba(6, 75, 85, 0.32) 100%)',
            mixBlendMode: 'multiply',
          }}
        />
      )}
      {isUnderwater && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 141,
            pointerEvents: 'none',
            // Soft sunlight bleed near water surface at top of screen
            background: 'radial-gradient(ellipse at 50% 0%, rgba(130, 245, 250, 0.18) 0%, transparent 65%)',
          }}
        />
      )}

      {/* 2. Tidewater-inspired minimalist Depth HUD Indicator */}
      {isUnderwater && (
        <div
          style={{
            position: 'fixed',
            bottom: '120px',
            right: '28px',
            zIndex: 145,
            pointerEvents: 'none',
            color: 'rgba(140, 230, 245, 0.9)',
            fontSize: '12px',
            fontFamily: 'monospace',
            letterSpacing: '0.08em',
            textShadow: '0 0 10px rgba(40, 190, 220, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>〰</span>
            <span style={{ fontWeight: 700 }}>
              {Math.max(0.4, swimDepth).toFixed(1)} m
            </span>
          </div>
          <span style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.12em' }}>
            SUBMERGED
          </span>
          <span style={{ fontSize: '8px', opacity: 0.5, marginTop: '2px' }}>
            [ SPACE ] ↑   [ C ] ↓
          </span>
        </div>
      )}

      {/* 3. Subtle surface splash shimmer (clears quickly) */}
      {isSurface && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 139,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(60, 180, 200, 0.08) 0%, transparent 60%)',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
    </>
  );
};
