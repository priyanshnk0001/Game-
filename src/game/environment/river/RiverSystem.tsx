/**
 * River System - Reusable 3D Scene Component
 *
 * Standalone, physically-grounded river waterway component.
 * Features river channel terrain features and shoreline river stone detailing.
 * Water surface rendering is temporarily disabled.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { RiverConfig, SECTOR02_RIVER_CONFIG } from './riverConfig';
import {
  getSector02RiverSpline,
  sampleRiverSpline,
  RiverSampledPoint,
} from './RiverFlow';

export interface RiverSystemProps {
  config?: RiverConfig;
  renderStones?: boolean;
}

/**
 * Procedural Natural River Stones positioned along the riverbank shallows
 */
function createRiverStonesGeometry(spline: RiverSampledPoint[], config: RiverConfig): THREE.BufferGeometry {
  const baseGeom = new THREE.DodecahedronGeometry(0.45, 1);
  const n = spline.length;
  const count = 48;
  const geoms: THREE.BufferGeometry[] = [];

  for (let i = 0; i < count; i++) {
    const sIdx = Math.floor(4 + ((i * 1.9) % (n - 8)));
    const pt = spline[sIdx];
    const side = i % 2 === 0 ? 1 : -1;

    // Position along shallow river edge / waterline
    const halfW = pt.width * 0.5;
    const offset = side * (halfW - 0.2 + ((i % 3) - 1) * 0.4);

    const px = pt.x + pt.normalX * offset;
    const pz = pt.z + pt.normalZ * offset;
    const py = config.waterLevel - 0.15; // Half-submerged in shallow bed

    const scaleX = 0.6 + ((i * 7) % 5) * 0.15;
    const scaleY = 0.4 + ((i * 3) % 4) * 0.10;
    const scaleZ = 0.6 + ((i * 11) % 5) * 0.15;

    const g = baseGeom.clone();
    g.scale(scaleX, scaleY, scaleZ);
    g.rotateY(i * 0.7);
    g.translate(px, py, pz);
    geoms.push(g);
  }

  const merged = mergeGeometries(geoms);
  return merged ?? baseGeom;
}

export const RiverSystem: React.FC<RiverSystemProps> = ({
  config = SECTOR02_RIVER_CONFIG,
  renderStones = true,
}) => {
  const spline = useMemo(() => {
    return config.id === SECTOR02_RIVER_CONFIG.id
      ? getSector02RiverSpline()
      : sampleRiverSpline(config);
  }, [config]);

  const stonesGeom = useMemo(() => {
    return renderStones ? createRiverStonesGeometry(spline, config) : null;
  }, [renderStones, spline, config]);

  const stonesMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#423d34', // River stone
      roughness: 0.85,
      metalness: 0.05,
    });
  }, []);

  return (
    <group name={`RiverSystem-${config.id}`}>
      {/* Water mesh rendering temporarily disabled */}

      {/* Shoreline River Stones */}
      {renderStones && stonesGeom && (
        <mesh geometry={stonesGeom} material={stonesMat} receiveShadow />
      )}
    </group>
  );
};
