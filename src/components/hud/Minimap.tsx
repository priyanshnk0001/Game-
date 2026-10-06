import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { MAPS } from '../../config/maps';
import { WorldObjectRegistry } from '../../game/world/WorldObjectRegistry';
import { TacticalWorldObject, TacticalLinearFeature, TacticalPOI } from './TacticalMapElements';
import { Compass, Maximize2 } from 'lucide-react';

interface MinimapProps {
  onOpenLargeMap: () => void;
  onOpenMapSelector: () => void;
}

// Tactical Radar Visible Radius in World Meters
const RADAR_RADIUS_METERS = 34;

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

  const px = localPlayer.position[0];
  const pz = localPlayer.position[2];

  // Player Heading: Clockwise angle from North (0 deg = North/-Z)
  const forwardX = Math.sin(localPlayer.rotationY);
  const forwardZ = Math.cos(localPlayer.rotationY);
  const headingDeg = (Math.atan2(forwardX, -forwardZ) * 180) / Math.PI;
  const compassHDG = Math.round(((headingDeg % 360) + 360) % 360);

  // Radar Scale: 100 SVG units = RADAR_RADIUS_METERS world meters
  const pixelsPerMeter = 100 / RADAR_RADIUS_METERS;

  // Project world X/Z to Minimap SVG coordinates relative to centered player (100, 100)
  const project = useCallback(
    (wx: number, wz: number): [number, number] => {
      return [100 + (wx - px) * pixelsPerMeter, 100 + (wz - pz) * pixelsPerMeter];
    },
    [px, pz, pixelsPerMeter]
  );

  // Cull world objects outside radar view (distance > RADAR_RADIUS_METERS + margin)
  const visibleObjects = useMemo(() => {
    const maxDist = RADAR_RADIUS_METERS + 18;
    const maxDistSq = maxDist * maxDist;
    return mapData.objects.filter((obj) => {
      const dx = obj.position[0] - px;
      const dz = obj.position[2] - pz;
      return dx * dx + dz * dz <= maxDistSq;
    });
  }, [mapData.objects, px, pz]);

  // Filter linear features (roads / rivers) that pass through or near the radar view
  const visibleLinearFeatures = useMemo(() => {
    const maxDist = RADAR_RADIUS_METERS + 25;
    return mapData.linearFeatures.filter((feat) => {
      return feat.points.some(([wx, wz]) => {
        const dx = wx - px;
        const dz = wz - pz;
        return dx * dx + dz * dz <= maxDist * maxDist;
      });
    });
  }, [mapData.linearFeatures, px, pz]);

  // Visible POIs near player
  const visiblePois = useMemo(() => {
    const maxDist = RADAR_RADIUS_METERS + 10;
    const maxDistSq = maxDist * maxDist;
    return mapData.pois.filter((poi) => {
      const dx = poi.x - px;
      const dz = poi.z - pz;
      return dx * dx + dz * dz <= maxDistSq;
    });
  }, [mapData.pois, px, pz]);

  // World boundary perimeter coordinates projected relative to player
  const b = mapData.bounds;
  const [bMinX, bMinZ] = project(b.minX, b.minZ);
  const [bMaxX, bMaxZ] = project(b.maxX, b.maxZ);

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
          X: <span style={{ color: '#f8fafc' }}>{px.toFixed(1)}</span>
        </span>
        <span>
          Z: <span style={{ color: '#f8fafc' }}>{pz.toFixed(1)}</span>
        </span>
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>HDG: {compassHDG}°</span>
      </div>

      {/* ======================================================== */}
      {/* 3. TACTICAL PLAYER-CENTERED RADAR MINIMAP */}
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

            {/* Minimap Viewport Clipping Mask */}
            <clipPath id="minimapClip">
              <rect x="0" y="0" width="200" height="200" rx="10" />
            </clipPath>
          </defs>

          {/* Clipped World Contents */}
          <g clipPath="url(#minimapClip)">
            {/* 1. Base Terrain Surface */}
            <rect
              x="0"
              y="0"
              width="200"
              height="200"
              fill={mapId === 'jungle-ops' ? '#121e14' : mapId === 'snow-ops' ? '#cbd5e1' : '#0b101b'}
            />

            {/* 2. Tactical Coordinate Grid */}
            <rect x="0" y="0" width="200" height="200" fill="url(#tacticalGrid)" />

            {/* 3. Linear World Features (Roads, Rivers) from Single Source of Truth */}
            {visibleLinearFeatures.map((feat) => (
              <TacticalLinearFeature key={feat.id} feature={feat} project={project} scale={pixelsPerMeter} />
            ))}

            {/* 4. Actual Playground World Objects (Houses, Trees, Bunkers, Rocks, Containers, Walls) */}
            {visibleObjects.map((obj) => (
              <TacticalWorldObject key={obj.id} object={obj} project={project} scale={pixelsPerMeter} />
            ))}

            {/* 5. World Outer Perimeter Boundary Lines */}
            <rect
              x={Math.min(bMinX, bMaxX)}
              y={Math.min(bMinZ, bMaxZ)}
              width={Math.abs(bMaxX - bMinX)}
              height={Math.abs(bMaxZ - bMinZ)}
              fill="none"
              stroke="rgba(56, 189, 248, 0.75)"
              strokeWidth="2.5"
            />

            {/* 6. Tactical POI Labels */}
            {visiblePois.map((poi) => (
              <TacticalPOI key={poi.id} poi={poi} project={project} />
            ))}

            {/* 7. Radar Range Concentric Rings (Centered at 100, 100) */}
            <circle cx="100" cy="100" r="45" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="0.8" />
            <circle cx="100" cy="100" r="75" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="0.8" />

            {/* 8. Subtle Radar Sweep Beam */}
            <g className="animate-radar-sweep">
              <line x1="100" y1="100" x2="100" y2="5" stroke="rgba(6, 182, 212, 0.35)" strokeWidth="1.5" />
              <polygon points="100,100 90,10 100,5" fill="rgba(6, 182, 212, 0.12)" />
            </g>

            {/* 9. LOCAL OPERATOR MARKER (Centered at 100, 100) */}
            <g transform="translate(100, 100)">
              {/* Pulsing Locator Wave */}
              <circle cx="0" cy="0" r="10" fill="none" stroke="#22d3ee" strokeWidth="1.2" opacity="0.6" />

              {/* Heading-Aligned Group */}
              <g transform={`rotate(${headingDeg})`}>
                {/* Forward Vision FOV Cone */}
                <polygon points="0,0 -16,-34 16,-34" fill="url(#playerFovGrad)" />

                {/* Tactical Arrow / Triangle */}
                <polygon points="0,-8 5,5 0,2 -5,5" fill="#06b6d4" stroke="#ffffff" strokeWidth="0.9" />
              </g>

              {/* Center Position Dot */}
              <circle cx="0" cy="0" r="2.2" fill="#ffffff" stroke="#0891b2" strokeWidth="1" />
            </g>
          </g>

          {/* Compass Cardinal Points */}
          <text x="100" y="11" fill="#38bdf8" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            N
          </text>
          <text x="100" y="195" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            S
          </text>
          <text x="9" y="103" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            W
          </text>
          <text x="191" y="103" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            E
          </text>
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
