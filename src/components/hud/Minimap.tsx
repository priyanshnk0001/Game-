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
            transition: 'border-color 0.15s, background-color 0.15s',
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
              {/* Dirt pathways */}
              <path d="M 15 100 Q 60 90 100 100 T 185 100" stroke="#2a1f16" strokeWidth="16" fill="none" />
              <path d="M 100 15 Q 90 60 100 100 T 100 185" stroke="#2a1f16" strokeWidth="16" fill="none" />

              {/* Ancient Moss Ruins Shrine (Center, [0, 0]) */}
              <rect x="90" y="90" width="20" height="20" fill="#2d4a34" stroke="#4ade80" strokeWidth="1.2" rx="2" />
              <rect x="92.5" y="92.5" width="5" height="5" fill="#1b2e21" />
              <rect x="102.5" y="102.5" width="5" height="5" fill="#1b2e21" />
              <text x="100" y="102" fill="#86efac" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">RUINS</text>

              {/* Mossy Boulders */}
              <circle cx="64" cy="64" r="7.5" fill="#384937" stroke="#86efac" strokeWidth="0.8" />
              <circle cx="136" cy="136" r="8" fill="#384937" stroke="#86efac" strokeWidth="0.8" />
              <circle cx="139" cy="68" r="6.5" fill="#384937" stroke="#86efac" strokeWidth="0.8" />
              <circle cx="61" cy="132" r="7" fill="#384937" stroke="#86efac" strokeWidth="0.8" />

              {/* Fallen Hardwood Logs */}
              <rect x="88" y="75" width="24" height="4.5" fill="#523a28" stroke="#785338" strokeWidth="0.8" rx="2" />
              <rect x="88" y="121" width="24" height="4.5" fill="#523a28" stroke="#785338" strokeWidth="0.8" rx="2" />
              <rect x="71" y="94" width="4.5" height="20" fill="#523a28" stroke="#785338" strokeWidth="0.8" rx="2" />
              <rect x="125" y="86" width="4.5" height="20" fill="#523a28" stroke="#785338" strokeWidth="0.8" rx="2" />

              {/* Jungle Watchtowers */}
              <rect x="31" y="49" width="16" height="16" fill="#4a3728" stroke="#a16207" strokeWidth="1" rx="1.5" />
              <text x="39" y="59" fill="#fef08a" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">TOWER</text>

              <rect x="153" y="135" width="16" height="16" fill="#4a3728" stroke="#a16207" strokeWidth="1" rx="1.5" />
              <text x="161" y="145" fill="#fef08a" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">TOWER</text>

              {/* Stockades */}
              <rect x="41" y="89" width="4" height="22" fill="#5c4033" stroke="#785338" strokeWidth="0.8" />
              <rect x="155" y="89" width="4" height="22" fill="#5c4033" stroke="#785338" strokeWidth="0.8" />

              {/* Canopy Trees */}
              {[
                [29, 29], [171, 29], [29, 171], [171, 171], [86, 36], [114, 164]
              ].map(([tx, ty], i) => (
                <circle key={i} cx={tx} cy={ty} r="8" fill="rgba(22, 101, 52, 0.75)" stroke="#15803d" strokeWidth="0.8" />
              ))}
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
