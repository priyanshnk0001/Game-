import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { MAPS } from '../../config/maps';
import { X, Navigation, Crosshair } from 'lucide-react';

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

  const mapId = state.activeMapId || 'battle-area';
  const mapDef = MAPS[mapId] || MAPS['battle-area'];
  const bounds = mapDef.bounds;

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

  if (!isOpen) return null;

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
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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
              <span>X: <strong style={{ color: '#f8fafc' }}>{clampX.toFixed(1)}m</strong></span>
              <span>Z: <strong style={{ color: '#f8fafc' }}>{clampZ.toFixed(1)}m</strong></span>
              <span style={{ color: '#38bdf8' }}>HDG: <strong>{compassHDG}°</strong></span>
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

              {/* COMPLETE BATTLE AREA LAYOUT */}
              {mapId === 'battle-area' && (
                <g id="large-battle-area-geometry">
                  {/* Tarmac Runways */}
                  <rect x="3" y="87.5" width="194" height="25" fill="#141d2c" />
                  <line x1="6" y1="100" x2="194" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="5,4" />

                  <rect x="87.5" y="3" width="25" height="194" fill="#141d2c" />
                  <line x1="100" y1="6" x2="100" y2="194" stroke="#334155" strokeWidth="1" strokeDasharray="5,4" />

                  {/* Central Depot */}
                  <circle cx="100" cy="100" r="26" fill="#172233" stroke="#334155" strokeWidth="1" />
                  <rect x="97" y="97" width="6" height="6" fill="#047857" stroke="#34d399" strokeWidth="0.8" rx="0.8" />
                  <text x="100" y="108" fill="#34d399" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">DEPOT</text>

                  {/* Command Bunker Shoot House */}
                  <g id="large-cmd">
                    <rect x="28.5" y="49" width="28.5" height="27" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.4" rx="1.5" />
                    <rect x="31" y="52" width="10" height="9" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
                    <text x="42.7" y="65" fill="#e2e8f0" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">COMMAND</text>
                  </g>

                  {/* Observation Shoot House */}
                  <g id="large-obs">
                    <rect x="143" y="124" width="28.5" height="27" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.4" rx="1.5" />
                    <rect x="159" y="139" width="10" height="9" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
                    <text x="157.2" y="140" fill="#e2e8f0" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">OBSERVATION</text>
                  </g>

                  {/* Shipping Containers */}
                  <g transform="translate(67.8, 67.8) rotate(11.5)">
                    <rect x="-11.6" y="-4.5" width="23.2" height="8.9" fill="#1e3a5f" stroke="#38bdf8" strokeWidth="1.2" rx="1" />
                    <text x="0" y="2.5" fill="#e0f2fe" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CONTAINER A</text>
                  </g>
                  <g transform="translate(132.2, 132.2) rotate(-11.5)">
                    <rect x="-11.6" y="-4.5" width="23.2" height="8.9" fill="#7c2d12" stroke="#fb923c" strokeWidth="1.2" rx="1" />
                    <text x="0" y="2.5" fill="#ffedd5" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CONTAINER B</text>
                  </g>

                  {/* Barriers */}
                  <rect x="94.3" y="87" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.8" rx="0.5" />
                  <rect x="94.3" y="110" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.8" rx="0.5" />
                  <g transform="translate(76.8, 130.3) rotate(45)"><rect x="-5.7" y="-1.25" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.8" rx="0.5" /></g>
                  <g transform="translate(123.2, 69.6) rotate(45)"><rect x="-5.7" y="-1.25" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.8" rx="0.5" /></g>
                  <g transform="translate(62.5, 83.9) rotate(-30)"><rect x="-5.7" y="-1.25" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.8" rx="0.5" /></g>
                  <g transform="translate(137.5, 116.1) rotate(-30)"><rect x="-5.7" y="-1.25" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.8" rx="0.5" /></g>

                  {/* Sandbags */}
                  <g transform="translate(83.9, 105.3) rotate(90)"><rect x="-4.6" y="-1.5" width="9.3" height="3.0" fill="#a16207" stroke="#fde047" strokeWidth="0.8" rx="1.5" /></g>
                  <g transform="translate(116.1, 94.6) rotate(-90)"><rect x="-4.6" y="-1.5" width="9.3" height="3.0" fill="#a16207" stroke="#fde047" strokeWidth="0.8" rx="1.5" /></g>
                  <rect x="52.5" y="120" width="9.3" height="3.0" fill="#a16207" stroke="#fde047" strokeWidth="0.8" rx="1.5" />
                  <rect x="138.2" y="77" width="9.3" height="3.0" fill="#a16207" stroke="#fde047" strokeWidth="0.8" rx="1.5" />
                </g>
              )}

              {mapId === 'jungle-ops' && (
                <g id="large-jungle-geometry">
                  <path d="M 15 100 Q 60 90 100 100 T 185 100" stroke="#2a1f16" strokeWidth="18" fill="none" />
                  <path d="M 100 15 Q 90 60 100 100 T 100 185" stroke="#2a1f16" strokeWidth="18" fill="none" />
                  <rect x="90" y="90" width="20" height="20" fill="#2d4a34" stroke="#4ade80" strokeWidth="1.4" rx="2" />
                  <text x="100" y="102" fill="#86efac" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">ANCIENT SHRINE</text>
                  <circle cx="64" cy="64" r="9" fill="#384937" stroke="#86efac" strokeWidth="1" />
                  <circle cx="136" cy="136" r="9.5" fill="#384937" stroke="#86efac" strokeWidth="1" />
                  <rect x="31" y="49" width="18" height="18" fill="#4a3728" stroke="#a16207" strokeWidth="1.2" rx="1.5" />
                  <text x="40" y="60" fill="#fef08a" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">WEST TOWER</text>
                  <rect x="151" y="133" width="18" height="18" fill="#4a3728" stroke="#a16207" strokeWidth="1.2" rx="1.5" />
                  <text x="160" y="144" fill="#fef08a" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">EAST TOWER</text>
                </g>
              )}

              {mapId === 'snow-ops' && (
                <g id="large-snow-geometry">
                  <polygon points="80,90 120,80 130,120 90,125" fill="rgba(125, 211, 252, 0.45)" stroke="#38bdf8" strokeWidth="1" />
                  <rect x="27" y="47" width="30" height="26" fill="#475569" stroke="#38bdf8" strokeWidth="1.4" rx="1.5" />
                  <text x="42" y="62" fill="#e0f2fe" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">RADAR BUNKER</text>
                  <rect x="143" y="127" width="30" height="26" fill="#475569" stroke="#38bdf8" strokeWidth="1.4" rx="1.5" />
                  <text x="158" y="142" fill="#e0f2fe" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CRYOGENIC LAB</text>
                </g>
              )}

              {/* Perimeter Walls */}
              <rect x="2.5" y="2.5" width="195" height="195" fill="none" stroke="rgba(56, 189, 248, 0.85)" strokeWidth="2.5" />

              {/* LOCAL OPERATOR ONLY INDICATOR (Zero enemy tracking!) */}
              <g transform={`translate(${playerSvgX}, ${playerSvgY})`}>
                <circle cx="0" cy="0" r="14" fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.6" />
                <g transform={`rotate(${headingDeg})`}>
                  <polygon points="0,0 -20,-44 20,-44" fill="url(#largeFovGrad)" />
                  <polygon points="0,-12 7,7 0,3 -7,7" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.2" />
                </g>
                <circle cx="0" cy="0" r="3" fill="#ffffff" stroke="#0891b2" strokeWidth="1.5" />

                {/* Callout Label */}
                <rect x="-24" y="6" width="48" height="11" fill="rgba(2, 6, 23, 0.9)" stroke="#06b6d4" strokeWidth="0.8" rx="3" />
                <text x="0" y="14" fill="#67e8f9" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  YOU ({localPlayer.name})
                </text>
              </g>

              {/* Compass Cardinal Points */}
              <text x="100" y="11" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">N</text>
              <text x="100" y="195" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">S</text>
              <text x="9" y="103" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">W</text>
              <text x="191" y="103" fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">E</text>
            </svg>
          </div>
        </div>

        {/* Footer info bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid rgba(30, 41, 59, 0.8)',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crosshair style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
            <span>OPERATOR POSITION VERIFIED • COMPLETE BATTLEFIELD SCHEMATIC</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                fontSize: '10px',
              }}
            >
              ESC / M
            </kbd>
            <span>TO CLOSE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
