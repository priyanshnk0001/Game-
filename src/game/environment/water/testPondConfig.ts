/**
 * Isolated Test Pond Configuration
 *
 * Standalone configuration for testing realistic PUBG-style water in an isolated pit.
 * Placed in the open clearing directly in front of the initial player spawn in Sector-02.
 * COMPLETELY ISOLATED from the existing river system.
 */

export const TEST_POND_CONFIG = {
  // Center coordinates in front of Player 1 spawn ([-54, 0.9, -50], facing NE)
  center: [-44.0, -40.0] as [number, number],
  
  // Outer boundary where the pit depression smoothly meets natural playground terrain
  rimRadius: 7.2,
  
  // Waterline radius where the water surface meets the sloping pond banks
  waterRadius: 5.2,
  
  // Flat bottom floor radius of the depression
  floorRadius: 2.8,
  
  // Elevation of the surrounding terrain rim (~0.86m in Sector-02 clearing)
  rimElevation: 0.86,
  
  // Water surface elevation (sits 36cm inside the pit below the rim)
  waterElevation: 0.50,
  
  // Bed floor elevation (bottom is ~1.20m below water surface for realistic depth evaluation)
  bedElevation: -0.70,
  
  // Water colors for realistic depth gradient
  shallowWaterColor: '#1cbdb0', // Crystal clear tropical blue-green near banks
  deepWaterColor: '#031f32',    // Deep dark navy blue in deep center
  baseWaterColor: '#06293d',    // Three.js Water scatter color
};

/**
 * Calculates ground depression for the test pond.
 * Returns negative elevation delta (in meters) within the pond basin,
 * and exactly 0.0 everywhere outside rimRadius to ensure ZERO impact on surrounding terrain.
 */
export function getTestPondDepression(x: number, z: number): number {
  const dx = x - TEST_POND_CONFIG.center[0];
  const dz = z - TEST_POND_CONFIG.center[1];
  const dist = Math.hypot(dx, dz);

  // Quick bounding box / radial rejection: zero impact outside rim
  if (dist >= TEST_POND_CONFIG.rimRadius + 0.3) {
    return 0;
  }

  // Organic shape modulation so the pit has natural, non-mechanical shores
  const angle = Math.atan2(dz, dx);
  const organicOffset = Math.sin(angle * 3.0) * 0.22 + Math.cos(angle * 5.0) * 0.12;
  const effectiveRim = TEST_POND_CONFIG.rimRadius + organicOffset;
  const effectiveFloor = TEST_POND_CONFIG.floorRadius + organicOffset * 0.4;

  if (dist >= effectiveRim) {
    return 0;
  }

  const totalDrop = TEST_POND_CONFIG.bedElevation - TEST_POND_CONFIG.rimElevation; // ~ -1.52m

  if (dist <= effectiveFloor) {
    return totalDrop;
  }

  // Smooth Hermite blend between floor and rim
  const t = (dist - effectiveFloor) / (effectiveRim - effectiveFloor);
  const smooth = t * t * (3.0 - 2.0 * t); // 0 at floor, 1 at rim
  return totalDrop * (1.0 - smooth);
}
