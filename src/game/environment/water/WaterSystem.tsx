/**
 * Reusable Water System - Master Component
 *
 * Fully modular, configurable water environment system suitable for:
 * - Procedural Rivers (spline ribbons)
 * - Lakes (circular/polygonal basins)
 * - Oceans (infinite expanses)
 * - Ponds (localized pools)
 *
 * Integrates:
 * 1. WaterSurface (GPU shader with waves, Fresnel, specular glints, double-side Snell's window)
 * 2. UnderwaterAtmosphere (Tidewater fog transition, dancing riverbed caustics, god rays, marine particles)
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { WaterConfig, DEFAULT_RIVER_WATER_CONFIG } from './WaterConfig';
import { WaterSurface } from './WaterSurface';
import { UnderwaterAtmosphere } from './UnderwaterAtmosphere';
import { RiverSampledPoint } from '../river/RiverFlow';

export interface WaterSystemProps {
  config?: WaterConfig;
  geometry?: THREE.BufferGeometry;
  spline?: RiverSampledPoint[];
  sunPosition?: [number, number, number];
  isCameraUnderwaterFn?: (camPos: THREE.Vector3) => boolean;
  renderCaustics?: boolean;
}

/**
 * Generates fallback plane geometry if none provided (for ocean/lake/pond)
 */
function createDefaultWaterGeometry(config: WaterConfig): THREE.BufferGeometry {
  const size = config.type === 'ocean' ? 1200 : config.type === 'lake' ? 250 : 50;
  const segments = 48;
  const geom = new THREE.PlaneGeometry(size, size, segments, segments);
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, config.waterLevel, 0);
  return geom;
}

export const WaterSystem: React.FC<WaterSystemProps> = ({
  config = DEFAULT_RIVER_WATER_CONFIG,
  geometry,
  spline,
  sunPosition = [100, 150, 100],
  isCameraUnderwaterFn,
  renderCaustics = true,
}) => {
  // Use provided geometry or create default procedural plane
  const waterGeometry = useMemo(() => {
    if (geometry) return geometry;
    return createDefaultWaterGeometry(config);
  }, [geometry, config]);

  return (
    <group name={`WaterSystem-${config.id}`}>
      {/* 1. Realistic GPU Shader Water Surface */}
      <WaterSurface
        geometry={waterGeometry}
        config={config}
        sunPosition={sunPosition}
      />

      {/* 2. Underwater Atmospheric Effects, Riverbed Caustics & God Rays */}
      {renderCaustics && (
        <UnderwaterAtmosphere
          config={config}
          spline={spline}
          sunPosition={sunPosition}
          isCameraUnderwaterFn={isCameraUnderwaterFn}
        />
      )}
    </group>
  );
};
