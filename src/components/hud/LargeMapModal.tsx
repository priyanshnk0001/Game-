import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { MAPS } from '../../config/maps';
import { WorldObjectRegistry } from '../../game/world/WorldObjectRegistry';
import { TacticalWorldObject, TacticalLinearFeature, TacticalPOI } from './TacticalMapElements';
import { X, Navigation } from 'lucide-react';

interface LargeMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LargeMapModal: React.FC<LargeMapModalProps> = ({ isOpen, onClose }) => {
  const state = useGameState();
  const activeId = state.activePlayerId;
  const localPlayer = state.players[activeId];

  // 60FPS live player position & heading tracking loop
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    let lastX = localPlayer.position[0];
    let lastZ = localPlayer.position[2];
    let lastRot = localPlayer.rotationY;

    const syncLoop = () => {
      const curX = localPlayer.position[0];
      const curZ = localPlayer.position[2];
      const curRot = localPlayer.rotationY;

      if (
        Math.abs(curX - lastX) > 0.001 ||
        Math.abs(curZ - lastZ) > 0.001 ||
        Math.abs(curRot - lastRot) > 0.002
      ) {
        lastX = curX;
        lastZ = curZ;
        lastRot = curRot;
        setTick((t) => (t + 1) % 10000);
      }
      animId = requestAnimationFrame(syncLoop);
    };

    animId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, localPlayer]);

  // Listen to WorldObjectRegistry dynamic modifications
  const [, setRegistryTick] = useState(0);
  useEffect(() => {
    return WorldObjectRegistry.subscribe(() => {
      setRegistryTick((t) => t + 1);
    });
  }, []);

  const mapId = state.activeMapId || 'battle-area';
  const mapDef = MAPS[mapId] || MAPS['battle-area'];
  const mapData = useMemo(() => WorldObjectRegistry.getWorldMapData(mapId), [mapId]);

  // Listen for ESC or 'M' key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const bounds = mapData.bounds;
  const rangeX = bounds.maxX - bounds.minX;
  const rangeZ = bounds.maxZ - bounds.minZ;

  const clampX = Math.max(bounds.minX, Math.min(bounds.maxX, localPlayer.position[0]));
  const clampZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, localPlayer.position[2]));

  // Map to SVG coordinate space [0..200]
  const playerSvgX = ((clampX - bounds.minX) / rangeX) * 200;
  const playerSvgY = ((clampZ - bounds.minZ) / rangeZ) * 200;

  // Forward heading in degrees
  const forwardX = Math.sin(localPlayer.rotationY);
  const forwardZ = Math.cos(localPlayer.rotationY);
  const headingDeg = (Math.atan2(forwardX, -forwardZ) * 180) / Math.PI;
  const compassHDG = Math.round(((headingDeg % 360) + 360) % 360);

  // Large Map Scale: 200 SVG units across rangeX
  const scale = 200 / rangeX;

  // World-to-Map projection for Large Map
  const project = useCallback(
    (wx: number, wz: number): [number, number] => {
      return [((wx - bounds.minX) / rangeX) * 200, ((wz - bounds.minZ) / rangeZ) * 200];
    },
    [bounds.minX, bounds.minZ, rangeX, rangeZ]
  );

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          borderRadius: '16px',
          backgroundColor: '#090d16',
          border: '1.5px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(6, 182, 212, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'monospace',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(30, 41, 59, 0.8)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Navigation style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.1em' }}>
                  {mapDef.sectorCode}
                </span>
                <span style={{ color: '#475569' }}>|</span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 900,
                    color: '#ffffff',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {mapDef.name}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{mapDef.tagline}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#94a3b8',
                backgroundColor: 'rgba(2, 6, 23, 0.8)',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(51, 65, 85, 0.6)',
              }}
            >
              <span>
                X: <strong style={{ color: '#f8fafc' }}>{clampX.toFixed(1)}m</strong>
              </span>
              <span>
                Z: <strong style={{ color: '#f8fafc' }}>{clampZ.toFixed(1)}m</strong>
              </span>
              <span style={{ color: '#38bdf8' }}>
                HDG: <strong>{compassHDG}°</strong>
              </span>
            </div>

            <button
              id="btn-close-largemap"
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>

        {/* Blueprint Map Canvas Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '460px',
            padding: '16px',
            backgroundColor: '#070b12',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Inner Blueprint Container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              borderRadius: '10px',
              border: '1px solid rgba(51, 65, 85, 0.7)',
              backgroundColor: '#080d17',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 24px rgba(0, 0, 0, 0.8)',
            }}
          >
            <svg
              viewBox="0 0 200 200"
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            >
              <defs>
                <pattern id="largeGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(51, 65, 85, 0.22)" strokeWidth="0.5" />
                </pattern>
                <linearGradient id="largeFovGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Base terrain */}
              <rect
                x="0"
                y="0"
                width="200"
                height="200"
                fill={mapId === 'jungle-ops' ? '#121e14' : mapId === 'snow-ops' ? '#cbd5e1' : '#0b101b'}
              />
              <rect x="0" y="0" width="200" height="200" fill="url(#largeGrid)" />

              {/* Major Axis Lines */}
              <line x1="100" y1="0" x2="100" y2="200" stroke="rgba(6, 182, 212, 0.18)" strokeWidth="0.8" />
              <line x1="0" y1="100" x2="200" y2="100" stroke="rgba(6, 182, 212, 0.18)" strokeWidth="0.8" />

              {/* Concentric Blueprint Rings */}
              <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="0.8" />
              <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(56, 189, 248, 0.14)" strokeWidth="0.8" />
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="0.8" />

              {/* Linear Features (Roads, Rivers) from Single Source of Truth */}
              {mapData.linearFeatures.map((feat) => (
                <TacticalLinearFeature key={feat.id} feature={feat} project={project} scale={scale} />
              ))}

              {/* Actual World Objects from Single Source of Truth */}
              {mapData.objects.map((obj) => (
                <TacticalWorldObject key={obj.id} object={obj} project={project} scale={scale} />
              ))}

              {/* Outer Perimeter Wall Boundary */}
              <rect
                x="2"
                y="2"
                width="196"
                height="196"
                fill="none"
                stroke="rgba(56, 189, 248, 0.75)"
                strokeWidth="1.8"
              />

              {/* Tactical POI Labels */}
              {mapData.pois.map((poi) => (
                <TacticalPOI key={poi.id} poi={poi} project={project} />
              ))}

              {/* Local Player Marker */}
              <g transform={`translate(${playerSvgX}, ${playerSvgY})`}>
                <circle cx="0" cy="0" r="10" fill="none" stroke="#22d3ee" strokeWidth="1.2" opacity="0.6" />
                <g transform={`rotate(${headingDeg})`}>
                  <polygon points="0,0 -16,-34 16,-34" fill="url(#largeFovGrad)" />
                  <polygon points="0,-8 5,5 0,2 -5,5" fill="#06b6d4" stroke="#ffffff" strokeWidth="0.9" />
                </g>
                <circle cx="0" cy="0" r="2.4" fill="#ffffff" stroke="#0891b2" strokeWidth="1" />
              </g>

              {/* Compass Cardinal Points */}
              <text x="100" y="11" fill="#38bdf8" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                N
              </text>
              <text x="100" y="196" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                S
              </text>
              <text x="8" y="103" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                W
              </text>
              <text x="192" y="103" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                E
              </text>
            </svg>
          </div>
        </div>

        {/* Footer Hint Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            borderTop: '1px solid rgba(30, 41, 59, 0.8)',
            fontSize: '10px',
            color: '#64748b',
          }}
        >
          <span>PRESS [M] OR [ESC] TO CLOSE MAP</span>
          <span style={{ color: '#38bdf8' }}>AUTHORITATIVE REAL-TIME SATELLITE GPS</span>
        </div>
      </div>
    </div>
  );
};
