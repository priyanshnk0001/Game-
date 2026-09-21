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
                  {/* 1. Natural Winding Creek Ravine Drainage */}
                  <path d="M 180 38 Q 130 75 100 100 T 20 162" stroke="#0e7490" strokeWidth="11" fill="none" opacity="0.65" />
                  <path d="M 180 38 Q 130 75 100 100 T 20 162" stroke="#155e75" strokeWidth="5.5" fill="none" opacity="0.8" />
                  <text x="64" y="118" fill="#38bdf8" fontSize="4.5" fontFamily="monospace" fontWeight="bold">CREEK RAVINE</text>

                  {/* 2. Hierarchical Road Network */}
                  {/* Primary Arterial Highway (West Logistics -> FOB Sabre -> Valley -> Bridge -> Ban Khao -> NE) */}
                  <path
                    d="M 0 40 L 37.5 40 Q 57.5 55 75 72.5 T 100 100 Q 115 117.5 142.5 144 T 172.5 175 L 200 200"
                    stroke="#78350f"
                    strokeWidth="7"
                    fill="none"
                  />
                  <path
                    d="M 0 40 L 37.5 40 Q 57.5 55 75 72.5 T 100 100 Q 115 117.5 142.5 144 T 172.5 175 L 200 200"
                    stroke="#b45309"
                    strokeWidth="4.5"
                    fill="none"
                    strokeDasharray="4,2"
                  />

                  {/* Southern Valley Secondary Road (Bridge Junction -> Ban Nam Hamlet -> Farmland -> Ban Khao) */}
                  <path
                    d="M 85 82.5 Q 94 70 115 62.5 T 135 57.5 Q 155 55 172.5 45 T 177.5 72.5 Q 162.5 105 142.5 132.5"
                    stroke="#78350f"
                    strokeWidth="5"
                    fill="none"
                  />
                  <path
                    d="M 85 82.5 Q 94 70 115 62.5 T 135 57.5 Q 155 55 172.5 45 T 177.5 72.5 Q 162.5 105 142.5 132.5"
                    stroke="#b45309"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="3,2"
                  />

                  {/* North Ridge Service Spur (Bridge Exit -> Valley -> Watchtower) */}
                  <path
                    d="M 115 117.5 Q 112.5 140 110 160 Q 105 175 100 185"
                    stroke="#78350f"
                    strokeWidth="4.5"
                    fill="none"
                  />
                  <path
                    d="M 115 117.5 Q 112.5 140 110 160 Q 105 175 100 185"
                    stroke="#b45309"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray="3,2"
                  />

                  {/* Ban Khao Village Footpaths */}
                  <path
                    d="M 130 132.5 L 142.5 137.5 L 150 152.5 L 155 165 L 170 170 L 180 157.5"
                    stroke="#a16207"
                    strokeWidth="2.4"
                    strokeDasharray="2.5,1.5"
                    fill="none"
                    opacity="0.85"
                  />

                  {/* Ban Nam Hamlet Footpaths */}
                  <path
                    d="M 135 57.5 L 137.5 62.5 L 145 60 L 160 57.5 L 167.5 55 L 172.5 40 L 172.5 27.5"
                    stroke="#a16207"
                    strokeWidth="2.4"
                    strokeDasharray="2.5,1.5"
                    fill="none"
                    opacity="0.85"
                  />

                  {/* 3. Central Timber Trestle Bridge */}
                  <g transform="translate(100, 100) rotate(45)">
                    <rect x="-3.5" y="-6.5" width="7" height="13" fill="#a16207" stroke="#fde047" strokeWidth="0.9" rx="0.5" />
                    <line x1="-3.5" y1="-3" x2="3.5" y2="-3" stroke="#451a03" strokeWidth="0.7" />
                    <line x1="-3.5" y1="3" x2="3.5" y2="3" stroke="#451a03" strokeWidth="0.7" />
                  </g>
                  <text x="108" y="104" fill="#fef08a" fontSize="4.5" fontFamily="monospace" fontWeight="bold">TIMBER BRIDGE</text>

                  {/* 4. Main Town "Ban Khao" (Northeast: [130..195, 130..195]) */}
                  <rect x="130" y="130" width="65" height="65" fill="rgba(180, 83, 9, 0.14)" stroke="rgba(245, 158, 11, 0.5)" strokeWidth="1" strokeDasharray="4,2" rx="4" />
                  <text x="162.5" y="137" fill="#fde047" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">BAN KHAO TOWN</text>
                  {/* Town Buildings */}
                  <rect x="150" y="160" width="10.5" height="9.5" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.8" rx="1" />
                  <rect x="138" y="134" width="9.5" height="7" fill="#78350f" stroke="#fcd34d" strokeWidth="0.8" rx="1" />
                  <rect x="170" y="143" width="9" height="8" fill="#b45309" stroke="#fed7aa" strokeWidth="0.8" rx="1" />
                  <rect x="166" y="173" width="8" height="8" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.8" rx="1" />
                  <rect x="136" y="168" width="8" height="9" fill="#78350f" stroke="#fcd34d" strokeWidth="0.8" rx="1" />
                  {/* Town Water Cistern */}
                  <circle cx="150" cy="157.5" r="2.5" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="0.7" />

                  {/* 5. Riverside Hamlet "Ban Nam" & Farmland (Southeast: [132..190, 16..68]) */}
                  <rect x="132" y="16" width="58" height="52" fill="rgba(101, 163, 13, 0.12)" stroke="rgba(132, 204, 22, 0.45)" strokeWidth="0.9" strokeDasharray="3,2" rx="3" />
                  <text x="161" y="24" fill="#bef264" fontSize="4.8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">BAN NAM HAMLET</text>
                  <rect x="141" y="56" width="8" height="7" fill="#78350f" stroke="#fcd34d" strokeWidth="0.8" rx="1" />
                  <rect x="163" y="51" width="8" height="7" fill="#b45309" stroke="#fed7aa" strokeWidth="0.8" rx="1" />
                  <rect x="168" y="24" width="9.5" height="8" fill="#78350f" stroke="#fcd34d" strokeWidth="0.8" rx="1" />
                  {/* Fishing Pier */}
                  <rect x="135" y="60" width="3" height="7" fill="#a16207" stroke="#fde047" strokeWidth="0.6" rx="0.5" />
                  <text x="133" y="71" fill="#fde047" fontSize="3" fontFamily="monospace">DOCK</text>

                  {/* 6. Tactical Military Compound "FOB Sabre" (Southwest: [15..60, 18..62]) */}
                  <rect x="15" y="18" width="45" height="44" fill="rgba(5, 150, 105, 0.16)" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1" strokeDasharray="4,2" rx="4" />
                  <text x="37.5" y="25" fill="#6ee7b7" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">FOB SABRE</text>
                  <rect x="29" y="28.5" width="14" height="3.2" fill="#047857" stroke="#34d399" strokeWidth="0.8" rx="0.5" />
                  <rect x="48" y="21" width="8" height="3.2" fill="#047857" stroke="#34d399" strokeWidth="0.8" rx="0.5" />
                  <rect x="16" y="44" width="9" height="7" fill="#065f46" stroke="#10b981" strokeWidth="0.8" rx="1" />
                  {/* Radio Mast */}
                  <circle cx="21" cy="44" r="2.5" fill="#dc2626" stroke="#fecaca" strokeWidth="0.8" />
                  <text x="21" y="40" fill="#f87171" fontSize="3.8" fontFamily="monospace" textAnchor="middle">RADIO</text>

                  {/* 7. Tactical Observation Watchtower (North Ridge [100, 185]) */}
                  <g id="large-tower-north">
                    <circle cx="100" cy="185" r="5" fill="#a16207" stroke="#fde047" strokeWidth="1.2" />
                    <text x="100" y="195" fill="#fde047" fontSize="4.8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">NORTH RIDGE TOWER</text>
                  </g>

                  {/* 8. Ancient Monastery Stone Ruins ([37.5, 160]) */}
                  <rect x="32" y="154" width="12" height="12" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" rx="1" />
                  <text x="38" y="162" fill="#93c5fd" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">RUINS</text>
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
