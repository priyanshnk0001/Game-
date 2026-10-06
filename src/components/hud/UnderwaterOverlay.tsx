import React, { useEffect, useRef } from 'react';
import { useGameState } from '../../hooks/useGameState';

/**
 * UnderwaterOverlay
 * Renders a blue-green tinted vignette with animated distortion when the
 * active player's camera is below the water surface.
 */
export const UnderwaterOverlay: React.FC = () => {
  const state = useGameState();
  const player = state.players[state.activePlayerId];
  const overlayRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const waterState = player?.waterState ?? 'land';
  const isUnderwater = waterState === 'underwater';
  const isSurface = waterState === 'surface';

  // Animate subtle distortion shimmer
  useEffect(() => {
    if (!isUnderwater) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const animate = (ts: number) => {
      timeRef.current = ts * 0.001;
      if (overlayRef.current) {
        const shimmer = Math.sin(timeRef.current * 1.4) * 0.5 + Math.sin(timeRef.current * 2.3) * 0.3;
        overlayRef.current.style.backdropFilter = `blur(${1.2 + shimmer * 0.6}px) saturate(1.4)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isUnderwater]);

  if (!isUnderwater && !isSurface) return null;

  return (
    <>
      {/* Underwater full-screen tint + fog */}
      {isUnderwater && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(5,60,90,0.55) 0%, rgba(2,30,55,0.82) 100%)',
            mixBlendMode: 'multiply',
            transition: 'opacity 0.4s ease',
          }}
        />
      )}
      {/* Underwater vignette edge darkening */}
      {isUnderwater && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 151,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,20,40,0.6) 100%)',
          }}
        />
      )}
      {/* Caustic light rays (animated pseudo-caustics) */}
      {isUnderwater && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 152,
            pointerEvents: 'none',
            opacity: 0.12,
            background: `repeating-linear-gradient(
              ${78 + Math.sin(Date.now() * 0.001) * 5}deg,
              transparent 0px,
              rgba(100,210,255,0.4) 3px,
              transparent 8px,
              transparent 40px
            )`,
            animation: 'uwCaustic 3s ease-in-out infinite alternate',
          }}
        />
      )}
      {/* Depth HUD indicator */}
      {isUnderwater && (
        <div
          style={{
            position: 'fixed',
            bottom: '120px',
            right: '24px',
            zIndex: 155,
            pointerEvents: 'none',
            color: 'rgba(160,230,255,0.85)',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textShadow: '0 0 8px rgba(60,180,255,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <span style={{ fontSize: '18px' }}>〜</span>
          <span>UNDERWATER</span>
          <span style={{ fontSize: '9px', opacity: 0.7 }}>[ SPACE ] ↑   [ F ] ↓</span>
        </div>
      )}
      {/* Surface entry ripple flash */}
      {isSurface && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 148,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(40,140,180,0.12) 0%, transparent 70%)',
          }}
        />
      )}
      <style>{`
        @keyframes uwCaustic {
          0%   { transform: skewX(-2deg) scaleX(0.98); opacity: 0.10; }
          50%  { transform: skewX(2deg)  scaleX(1.02); opacity: 0.16; }
          100% { transform: skewX(-1deg) scaleX(0.99); opacity: 0.08; }
        }
      `}</style>
    </>
  );
};
