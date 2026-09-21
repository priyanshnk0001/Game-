import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { MAPS } from '../../config/maps';
import { Compass, Maximize2 } from 'lucide-react';

interface MinimapProps {
  onOpenLargeMap: () => void;
  onOpenMapSelector: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({ onOpenLargeMap, onOpenMapSelector }) => {
  const state = useGameState();
  const activeId = state.activePlayerId;
  const localPlayer = state.players[activeId];

  // 60FPS live player position & heading tracking loop
  const [, setTick] = useState(0);

  useEffect(() => {
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
  }, [localPlayer]);

  const mapId = state.activeMapId || 'battle-area';
  const mapDef = MAPS[mapId] || MAPS['battle-area'];
  const bounds = mapDef.bounds;

  // World coordinate bounding range
  const rangeX = bounds.maxX - bounds.minX; // 56m
  const rangeZ = bounds.maxZ - bounds.minZ; // 56m

  const clampX = Math.max(bounds.minX, Math.min(bounds.maxX, localPlayer.position[0]));
  const clampZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, localPlayer.position[2]));

  // Map to SVG coordinates [0..200]
  const playerSvgX = ((clampX - bounds.minX) / rangeX) * 200;
  const playerSvgY = ((clampZ - bounds.minZ) / rangeZ) * 200;

  // Player Heading: Clockwise angle from North (0 deg = North/-Z)
  const forwardX = Math.sin(localPlayer.rotationY);
  const forwardZ = Math.cos(localPlayer.rotationY);
  const headingDeg = (Math.atan2(forwardX, -forwardZ) * 180) / Math.PI;
  const compassHDG = Math.round(((headingDeg % 360) + 360) % 360);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      {/* ======================================================== */}
      {/* 1. SECTOR HEADER BADGE (Button to switch map) */}
      {/* ======================================================== */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
        <button
          id="btn-select-map"
          onClick={onOpenMapSelector}
          title="Switch Battle Area"
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(2, 6, 23, 0.85)',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            color: '#38bdf8',
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            transition: 'border-color 0.15s, background-color 0.15s, transform 0.1s',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#38bdf8';
            e.currentTarget.style.backgroundColor = 'rgba(8, 47, 73, 0.9)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.8)';
            e.currentTarget.style.backgroundColor = 'rgba(2, 6, 23, 0.85)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Compass style={{ width: '12px', height: '12px', color: '#38bdf8' }} />
          <span>{mapDef.sectorCode}</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#e2e8f0' }}>{mapDef.name}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. REAL-TIME X / Z / HDG TELEMETRY PANEL */}
      {/* ======================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '2px 8px',
          borderRadius: '5px',
          backgroundColor: 'rgba(2, 6, 23, 0.75)',
          border: '1px solid rgba(30, 41, 59, 0.8)',
          color: '#94a3b8',
          fontFamily: 'monospace',
          fontSize: '9px',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        }}
      >
        <span>
          X: <span style={{ color: '#f8fafc' }}>{clampX.toFixed(1)}</span>
        </span>
        <span>
          Z: <span style={{ color: '#f8fafc' }}>{clampZ.toFixed(1)}</span>
        </span>
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>HDG: {compassHDG}°</span>
      </div>

      {/* ======================================================== */}
      {/* 3. REAL PUBG/BGMI-STYLE TACTICAL MINIMAP */}
      {/* Positioned BELOW the X/Z/HDG panel with proper spacing */}
      {/* ======================================================== */}
      <div
        id="minimap-container"
        onClick={onOpenLargeMap}
        title="Click to expand Tactical Map [M]"
        style={{
          marginTop: '8px',
          position: 'relative',
          width: '176px',
          height: '176px',
          borderRadius: '10px',
          backgroundColor: '#090d16',
          border: '1.5px solid rgba(56, 189, 248, 0.45)',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.8), inset 0 0 16px rgba(15, 23, 42, 0.6)',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {/* SVG Tactical Top-Down Battlefield */}
        <svg
          viewBox="0 0 200 200"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
          }}
        >
          <defs>
            {/* Tactical Grid Pattern */}
            <pattern id="tacticalGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(51, 65, 85, 0.25)" strokeWidth="0.75" />
            </pattern>

            {/* Radar Conic Sweep Gradient */}
            <linearGradient id="playerFovGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. Base Terrain Surface */}
          <rect
            x="0"
            y="0"
            width="200"
            height="200"
            fill={
              mapId === 'jungle-ops'
                ? '#121e14'
                : mapId === 'snow-ops'
                ? '#cbd5e1'
                : '#0b101b'
            }
          />

          {/* 2. Tactical Coordinate Grid */}
          <rect x="0" y="0" width="200" height="200" fill="url(#tacticalGrid)" />

          {/* 3. MAP-SPECIFIC COMPLETE BATTLE AREA LAYOUT */}
          {mapId === 'battle-area' && (
            <g id="battle-area-geometry">
              {/* Tarmac Runways / Roads (East-West & North-South) */}
              <rect x="3" y="87.5" width="194" height="25" fill="#141d2c" />
              <line x1="6" y1="100" x2="194" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="5,4" />

              <rect x="87.5" y="3" width="25" height="194" fill="#141d2c" />
              <line x1="100" y1="6" x2="100" y2="194" stroke="#334155" strokeWidth="1" strokeDasharray="5,4" />

              {/* Central Depot Courtyard */}
              <circle cx="100" cy="100" r="26" fill="#172233" stroke="#334155" strokeWidth="1" />

              {/* Spawn Staging Pads */}
              <circle cx="50" cy="100" r="8" fill="rgba(6, 182, 212, 0.15)" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
              <circle cx="150" cy="100" r="8" fill="rgba(244, 63, 94, 0.15)" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="1" />

              {/* Command Bunker Shoot House (West, [X: -16, Z: -10.5]) */}
              <g id="command-bunker">
                <rect x="28.5" y="49" width="28.5" height="27" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.2" rx="1.5" />
                <rect x="31" y="52" width="10" height="9" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
                <text x="42.7" y="65" fill="#94a3b8" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CMD</text>
              </g>

              {/* Observation Shoot House (East, [X: 16, Z: 10.5]) */}
              <g id="observation-bunker">
                <rect x="143" y="124" width="28.5" height="27" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.2" rx="1.5" />
                <rect x="159" y="139" width="10" height="9" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
                <text x="157.2" y="140" fill="#94a3b8" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">OBS</text>
              </g>

              {/* Shipping Container Alpha (Navy, [-9, -9], rot 0.2) */}
              <g transform="translate(67.8, 67.8) rotate(11.5)">
                <rect x="-11.6" y="-4.5" width="23.2" height="8.9" fill="#1e3a5f" stroke="#38bdf8" strokeWidth="1" rx="1" />
                <line x1="-5" y1="-4.5" x2="-5" y2="4.4" stroke="#38bdf8" strokeWidth="0.6" />
                <line x1="5" y1="-4.5" x2="5" y2="4.4" stroke="#38bdf8" strokeWidth="0.6" />
                <text x="0" y="2" fill="#e0f2fe" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">A</text>
              </g>

              {/* Shipping Container Bravo (Rust, [9, 9], rot -0.2) */}
              <g transform="translate(132.2, 132.2) rotate(-11.5)">
                <rect x="-11.6" y="-4.5" width="23.2" height="8.9" fill="#7c2d12" stroke="#fb923c" strokeWidth="1" rx="1" />
                <line x1="-5" y1="-4.5" x2="-5" y2="4.4" stroke="#fb923c" strokeWidth="0.6" />
                <line x1="5" y1="-4.5" x2="5" y2="4.4" stroke="#fb923c" strokeWidth="0.6" />
                <text x="0" y="2" fill="#ffedd5" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">B</text>
              </g>

              {/* Concrete Jersey Barriers */}
              <rect x="94.3" y="87" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.6" rx="0.5" />
              <rect x="94.3" y="110" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.6" rx="0.5" />
              <g transform="translate(76.8, 130.3) rotate(45)">
                <rect x="-5.7" y="-1.25" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.6" rx="0.5" />
              </g>
              <g transform="translate(123.2, 69.6) rotate(45)">
                <rect x="-5.7" y="-1.25" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.6" rx="0.5" />
              </g>
              <g transform="translate(62.5, 83.9) rotate(-30)">
                <rect x="-5.7" y="-1.25" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.6" rx="0.5" />
              </g>
              <g transform="translate(137.5, 116.1) rotate(-30)">
                <rect x="-5.7" y="-1.25" width="11.4" height="2.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.6" rx="0.5" />
              </g>

              {/* Sandbag Fortified Emplacements */}
              <g transform="translate(83.9, 105.3) rotate(90)">
                <rect x="-4.6" y="-1.5" width="9.3" height="3.0" fill="#a16207" stroke="#fde047" strokeWidth="0.6" rx="1.5" />
              </g>
              <g transform="translate(116.1, 94.6) rotate(-90)">
                <rect x="-4.6" y="-1.5" width="9.3" height="3.0" fill="#a16207" stroke="#fde047" strokeWidth="0.6" rx="1.5" />
              </g>
              <rect x="52.5" y="120" width="9.3" height="3.0" fill="#a16207" stroke="#fde047" strokeWidth="0.6" rx="1.5" />
              <rect x="138.2" y="77" width="9.3" height="3.0" fill="#a16207" stroke="#fde047" strokeWidth="0.6" rx="1.5" />

              {/* Ammo Crates & Center Depot */}
              <rect x="97" y="97" width="6" height="6" fill="#047857" stroke="#34d399" strokeWidth="0.8" rx="0.8" />
              <rect x="85.5" y="125" width="4.5" height="4.5" fill="#047857" stroke="#34d399" strokeWidth="0.6" rx="0.6" />
              <rect x="110.5" y="70.5" width="4.5" height="4.5" fill="#047857" stroke="#34d399" strokeWidth="0.6" rx="0.6" />

              {/* Corner Floodlight Towers */}
              <circle cx="14.3" cy="14.3" r="2.5" fill="#334155" stroke="#facc15" strokeWidth="0.8" />
              <circle cx="185.7" cy="14.3" r="2.5" fill="#334155" stroke="#facc15" strokeWidth="0.8" />
              <circle cx="14.3" cy="185.7" r="2.5" fill="#334155" stroke="#facc15" strokeWidth="0.8" />
              <circle cx="185.7" cy="185.7" r="2.5" fill="#334155" stroke="#facc15" strokeWidth="0.8" />
            </g>
          )}

          {mapId === 'jungle-ops' && (
            <g id="jungle-ops-geometry">
              {/* 1. Natural Winding Creek Ravine Drainage */}
              <path d="M 180 38 Q 130 75 100 100 T 20 162" stroke="#0e7490" strokeWidth="11" fill="none" opacity="0.65" />
              <path d="M 180 38 Q 130 75 100 100 T 20 162" stroke="#155e75" strokeWidth="5.5" fill="none" opacity="0.8" />

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
                strokeWidth="2.2"
                strokeDasharray="2,1.5"
                fill="none"
                opacity="0.85"
              />

              {/* Ban Nam Hamlet Footpaths */}
              <path
                d="M 135 57.5 L 137.5 62.5 L 145 60 L 160 57.5 L 167.5 55 L 172.5 40 L 172.5 27.5"
                stroke="#a16207"
                strokeWidth="2.2"
                strokeDasharray="2,1.5"
                fill="none"
                opacity="0.85"
              />

              {/* 3. Central Timber Trestle Bridge (Spans ravine at 45-deg collinear with road) */}
              <g transform="translate(100, 100) rotate(45)">
                <rect x="-3.5" y="-6.5" width="7" height="13" fill="#a16207" stroke="#fde047" strokeWidth="0.9" rx="0.5" />
                <line x1="-3.5" y1="-3" x2="3.5" y2="-3" stroke="#451a03" strokeWidth="0.7" />
                <line x1="-3.5" y1="3" x2="3.5" y2="3" stroke="#451a03" strokeWidth="0.7" />
              </g>

              {/* 4. Main Town "Ban Khao" (Northeast: [130..195, 130..195]) */}
              <rect x="130" y="130" width="65" height="65" fill="rgba(180, 83, 9, 0.14)" stroke="rgba(245, 158, 11, 0.45)" strokeWidth="0.8" strokeDasharray="4,2" rx="4" />
              <text x="162.5" y="137" fill="#fde047" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">BAN KHAO TOWN</text>
              {/* Town Buildings */}
              <rect x="150" y="160" width="10.5" height="9.5" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.8" rx="1" />
              <rect x="138" y="134" width="9.5" height="7" fill="#78350f" stroke="#fcd34d" strokeWidth="0.8" rx="1" />
              <rect x="170" y="143" width="9" height="8" fill="#b45309" stroke="#fed7aa" strokeWidth="0.8" rx="1" />
              <rect x="166" y="173" width="8" height="8" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.8" rx="1" />
              <rect x="136" y="168" width="8" height="9" fill="#78350f" stroke="#fcd34d" strokeWidth="0.8" rx="1" />
              {/* Town Water Cistern */}
              <circle cx="150" cy="157.5" r="2.2" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="0.6" />

              {/* 5. Riverside Hamlet "Ban Nam" & Farmland (Southeast: [132..190, 16..68]) */}
              <rect x="132" y="16" width="58" height="52" fill="rgba(101, 163, 13, 0.12)" stroke="rgba(132, 204, 22, 0.4)" strokeWidth="0.8" strokeDasharray="3,2" rx="3" />
              <text x="161" y="23" fill="#bef264" fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="middle">BAN NAM HAMLET</text>
              <rect x="141" y="56" width="8" height="7" fill="#78350f" stroke="#fcd34d" strokeWidth="0.8" rx="1" />
              <rect x="163" y="51" width="8" height="7" fill="#b45309" stroke="#fed7aa" strokeWidth="0.8" rx="1" />
              <rect x="168" y="24" width="9.5" height="8" fill="#78350f" stroke="#fcd34d" strokeWidth="0.8" rx="1" />
              {/* Fishing Pier */}
              <rect x="135" y="60" width="3" height="7" fill="#a16207" stroke="#fde047" strokeWidth="0.6" rx="0.5" />

              {/* 6. Tactical Military Compound "FOB Sabre" (Southwest: [15..60, 18..62]) */}
              <rect x="15" y="18" width="45" height="44" fill="rgba(5, 150, 105, 0.16)" stroke="rgba(16, 185, 129, 0.55)" strokeWidth="0.8" strokeDasharray="4,2" rx="4" />
              <text x="37.5" y="25" fill="#6ee7b7" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">FOB SABRE</text>
              <rect x="29" y="28.5" width="14" height="3.2" fill="#047857" stroke="#34d399" strokeWidth="0.8" rx="0.5" />
              <rect x="48" y="21" width="8" height="3.2" fill="#047857" stroke="#34d399" strokeWidth="0.8" rx="0.5" />
              <rect x="16" y="44" width="9" height="7" fill="#065f46" stroke="#10b981" strokeWidth="0.8" rx="1" />
              {/* Radio Mast with Warning Beacon */}
              <circle cx="21" cy="44" r="2.2" fill="#dc2626" stroke="#fecaca" strokeWidth="0.8" />

              {/* 7. Tactical Observation Watchtower (North Ridge [100, 185]) */}
              <g id="mini-tower-north">
                <circle cx="100" cy="185" r="4.2" fill="#a16207" stroke="#fde047" strokeWidth="1" />
                <text x="100" y="194" fill="#fde047" fontSize="4" fontFamily="monospace" fontWeight="bold" textAnchor="middle">NORTH TOWER</text>
              </g>

              {/* 8. Ancient Monastery Stone Ruins ([37.5, 160]) */}
              <rect x="32" y="154" width="11" height="11" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.8" rx="1" />
              <text x="37.5" y="161" fill="#93c5fd" fontSize="3.8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">RUINS</text>
            </g>
          )}

          {mapId === 'snow-ops' && (
            <g id="snow-ops-geometry">
              {/* Frozen Ice Patches */}
              <polygon points="80,90 120,80 130,120 90,125" fill="rgba(125, 211, 252, 0.45)" stroke="#38bdf8" strokeWidth="0.8" />
              <circle cx="57" cy="143" r="15" fill="rgba(125, 211, 252, 0.35)" stroke="#38bdf8" strokeWidth="0.6" />
              <circle cx="143" cy="57" r="16" fill="rgba(125, 211, 252, 0.35)" stroke="#38bdf8" strokeWidth="0.6" />

              {/* Arctic Research Bunkers */}
              <rect x="27" y="47" width="30" height="26" fill="#475569" stroke="#38bdf8" strokeWidth="1.2" rx="1.5" />
              <text x="42" y="62" fill="#e0f2fe" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">RADAR</text>

              <rect x="143" y="127" width="30" height="26" fill="#475569" stroke="#38bdf8" strokeWidth="1.2" rx="1.5" />
              <text x="158" y="142" fill="#e0f2fe" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CRYO</text>

              {/* Frosted Containers */}
              <g transform="translate(71, 129) rotate(-20)">
                <rect x="-11.6" y="-4.5" width="23.2" height="8.9" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1" rx="1" />
              </g>
              <g transform="translate(129, 71) rotate(20)">
                <rect x="-11.6" y="-4.5" width="23.2" height="8.9" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1" rx="1" />
              </g>

              {/* Snow Berms / Barriers */}
              <rect x="93" y="86" width="14" height="4" fill="#94a3b8" stroke="#f1f5f9" strokeWidth="0.8" rx="1" />
              <rect x="93" y="110" width="14" height="4" fill="#94a3b8" stroke="#f1f5f9" strokeWidth="0.8" rx="1" />

              {/* Alpine Pine Trees */}
              {[
                [21, 21], [179, 21], [21, 179], [179, 179], [78, 36], [122, 164]
              ].map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r="6.5" fill="#164e63" stroke="#f8fafc" strokeWidth="0.8" />
              ))}
            </g>
          )}

          {/* 4. Complete Perimeter Walls (Playable Area Boundaries) */}
          <rect
            x="2.5"
            y="2.5"
            width="195"
            height="195"
            fill="none"
            stroke="rgba(56, 189, 248, 0.7)"
            strokeWidth="2"
          />

          {/* Radar Concentric Rings */}
          <circle cx="100" cy="100" r="45" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="0.8" />
          <circle cx="100" cy="100" r="75" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="0.8" />

          {/* Subtle Radar Sweep Beam */}
          <g className="animate-radar-sweep">
            <line x1="100" y1="100" x2="100" y2="5" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1.5" />
            <polygon points="100,100 90,10 100,5" fill="rgba(6, 182, 212, 0.15)" />
          </g>

          {/* 5. LOCAL OPERATOR MARKER ONLY (Strictly NO enemies) */}
          <g transform={`translate(${playerSvgX}, ${playerSvgY})`}>
            {/* Pulsing Locator Wave */}
            <circle cx="0" cy="0" r="10" fill="none" stroke="#22d3ee" strokeWidth="1.2" opacity="0.6" />

            {/* Heading-Aligned Group */}
            <g transform={`rotate(${headingDeg})`}>
              {/* Forward Vision FOV Cone */}
              <polygon points="0,0 -16,-34 16,-34" fill="url(#playerFovGrad)" />

              {/* Tactical Arrow / Triangle */}
              <polygon
                points="0,-8 5,5 0,2 -5,5"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="0.9"
              />
            </g>

            {/* Center Bright Position Dot */}
            <circle cx="0" cy="0" r="2.2" fill="#ffffff" stroke="#0891b2" strokeWidth="1" />
          </g>

          {/* Compass Cardinal Points */}
          <text x="100" y="10" fill="#38bdf8" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">N</text>
          <text x="100" y="195" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">S</text>
          <text x="8" y="102" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">W</text>
          <text x="192" y="102" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">E</text>
        </svg>

        {/* Expand Tactical Map Corner Icon */}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            padding: '2px',
            borderRadius: '4px',
            backgroundColor: 'rgba(2, 6, 23, 0.8)',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Maximize2 style={{ width: '10px', height: '10px', color: '#38bdf8' }} />
        </div>
      </div>
    </div>
  );
};
