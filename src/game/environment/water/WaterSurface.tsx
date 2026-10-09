/**
 * Reusable Water System - Water Surface Component
 *
 * High-performance GPU shader-based water surface powered by the
 * realistic Three.js stdlib Water engine extracted from TestPondWater.
 */

import React from 'react';
import * as THREE from 'three';
import { WaterConfig, DEFAULT_RIVER_WATER_CONFIG } from './WaterConfig';
import { RealisticWaterSurface } from './WaterSystem';

export interface WaterSurfaceProps {
  geometry: THREE.BufferGeometry;
  config?: WaterConfig;
  sunPosition?: [number, number, number];
}

export const WaterSurface: React.FC<WaterSurfaceProps> = ({
  geometry,
  config = DEFAULT_RIVER_WATER_CONFIG,
  sunPosition = [100, 150, 100],
}) => {
  return (
    <RealisticWaterSurface
      geometry={geometry}
      config={config}
      sunPosition={sunPosition}
    />
  );
};
