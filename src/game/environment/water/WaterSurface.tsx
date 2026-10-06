/**
 * Reusable Water System - Water Surface Component
 *
 * High-performance GPU shader-based water surface.
 * Features:
 * - Directional flow along UV coordinates / river spline
 * - Procedural wave displacement & micro-normal perturbation
 * - Physically-inspired Schlick Fresnel reflectance
 * - Blinn-Phong specular sunlight glints
 * - Depth-dependent shallow-to-deep color absorption
 * - Double-sided rendering with underwater Snell's window / total internal reflection
 * - Shoreline soft lap & foam transition
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WaterConfig, DEFAULT_RIVER_WATER_CONFIG } from './WaterConfig';

export interface WaterSurfaceProps {
  geometry: THREE.BufferGeometry;
  config?: WaterConfig;
  sunPosition?: [number, number, number];
}

const WATER_VERTEX_SHADER = /* glsl */ `
  attribute vec2 aRiverParams; // x = edgeFactor [0..1], y = flowVelocityFactor

  uniform float uTime;
  uniform float uFlowSpeed;
  uniform float uWaveScale;
  uniform float uWaveSpeed;
  uniform float uWaveHeight;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vEdgeFactor;
  varying float vFlowVel;

  void main() {
    vUv = uv;
    vEdgeFactor = aRiverParams.x;
    vFlowVel = aRiverParams.y > 0.0 ? aRiverParams.y : 1.0;

    // Dampen waves near shoreline to prevent land clipping
    float shoreDamp = 1.0 - smoothstep(0.75, 1.0, vEdgeFactor);

    // Multi-harmonic gentle river current surface displacement
    float flowPhase1 = (uv.y * uWaveScale * 2.4) - (uTime * (uFlowSpeed * 0.85 + uWaveSpeed * 0.35) * vFlowVel);
    float flowPhase2 = (uv.y * uWaveScale * 4.8) - (uTime * (uFlowSpeed * 1.20 + uWaveSpeed * 0.50) * vFlowVel);
    float crossPhase = (uv.x * uWaveScale * 5.2) + (uTime * uWaveSpeed * 0.45);

    float waveY = (
      sin(flowPhase1) * 0.55 + 
      sin(flowPhase2 + crossPhase * 0.7) * 0.30 + 
      cos(crossPhase * 1.4 - flowPhase1 * 0.5) * 0.15
    ) * uWaveHeight * shoreDamp;

    // Displace vertex along normal
    vec3 displacedPos = position + vec3(0.0, waveY, 0.0);

    // Analytical normal approximation from wave derivatives
    float dFlow = (
      cos(flowPhase1) * 0.55 * (uWaveScale * 2.4) + 
      cos(flowPhase2 + crossPhase * 0.7) * 0.30 * (uWaveScale * 4.8)
    ) * uWaveHeight * shoreDamp;

    float dCross = (
      cos(flowPhase2 + crossPhase * 0.7) * 0.30 * (uWaveScale * 3.64) +
      -sin(crossPhase * 1.4 - flowPhase1 * 0.5) * 0.15 * (uWaveScale * 7.28)
    ) * uWaveHeight * shoreDamp;

    vec3 waveNormal = normalize(vec3(-dCross, 1.0, -dFlow));
    vNormal = normalize(mat3(modelMatrix) * waveNormal);

    vec4 worldPosition = modelMatrix * vec4(displacedPos, 1.0);
    vWorldPos = worldPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const WATER_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorShallow;
  uniform vec3 uColorDeep;
  uniform vec3 uColorHighlight;
  uniform vec3 uColorSunGlint;
  uniform vec3 uSunPosition;
  uniform vec3 uCameraPos;
  uniform float uFresnelPower;
  uniform float uRoughness;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uFlowSpeed;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vEdgeFactor;
  varying float vFlowVel;

  // Multi-frequency wave ripple normal calculation for realistic 3D liquid waves
  vec2 getRippleNormal(vec2 uv, float time, float speed, float vel) {
    float t = time * (speed * 0.65 + 0.35) * vel;
    // Primary flow ripple wave trains
    vec2 p1 = uv * 24.0 + vec2(0.0, -t * 1.8);
    // Intersecting diagonal ripples
    vec2 p2 = uv * 48.0 + vec2(sin(t * 0.7) * 0.4, -t * 2.5);
    // Fine capillary ripples
    vec2 p3 = uv * 82.0 + vec2(-t * 0.6, -t * 3.4);

    float dx = sin(p1.x * 1.8 + p1.y * 1.2) * 0.22 + 
               cos(p2.x * 2.4 - p2.y * 1.6) * 0.14 + 
               sin(p3.x * 3.2 + p3.y * 2.1) * 0.08;

    float dy = cos(p1.y * 1.8 + p1.x * 1.2) * 0.22 + 
               sin(p2.y * 2.4 + p2.x * 1.6) * 0.14 + 
               cos(p3.y * 3.2 - p3.x * 2.1) * 0.08;

    return vec2(dx, dy);
  }

  void main() {
    bool isUnderwaterLookingUp = !gl_FrontFacing;

    // Determine normal based on viewing face
    vec3 baseN = normalize(vNormal);
    if (isUnderwaterLookingUp) {
      baseN = -baseN;
    }

    // Add multi-scale wave ripple normal perturbation
    vec2 micro = getRippleNormal(vUv, uTime, uFlowSpeed, vFlowVel);
    vec3 N = normalize(baseN + vec3(micro.x, 0.0, micro.y));

    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uSunPosition);
    vec3 H = normalize(L + V);

    float NdotV = max(dot(N, V), 0.001);
    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);

    // Natural physical Fresnel reflection (R0 ~ 0.05)
    float fresnel = 0.06 + 0.94 * pow(1.0 - NdotV, 3.5);

    // Specular sunlight highlights across wave facets
    float specSharp = pow(NdotH, 64.0) * 2.0;
    float specBroad = pow(NdotH, 14.0) * 0.4;
    vec3 specularColor = uColorSunGlint * (specSharp + specBroad) * (NdotL * 0.8 + 0.2);

    // Depth-based color gradient: shallow near banks, rich deep water in channel
    float depthFactor = 1.0 - smoothstep(0.0, 0.85, vEdgeFactor);
    vec3 waterBodyColor = mix(uColorShallow, uColorDeep, depthFactor);

    // Internal water volume scatter (provides luminous liquid clarity, not flat mud)
    vec3 waterScatter = mix(uColorShallow, uColorHighlight, 0.4) * (0.15 + 0.15 * NdotL);
    waterBodyColor += waterScatter;

    // Subtle edge foam lace near banks
    float foamLap = smoothstep(0.84, 0.98, vEdgeFactor) * 
                    (sin(vUv.y * 35.0 + uTime * 2.5) * 0.5 + 0.5) * 
                    (sin(vUv.x * 45.0 - uTime * 1.5) * 0.5 + 0.5) * 0.35;
    waterBodyColor = mix(waterBodyColor, vec3(0.88, 0.96, 0.96), foamLap);

    vec3 finalColor;
    float finalAlpha;

    if (!isUnderwaterLookingUp) {
      // ABOVE WATER VIEW:
      // Physically-based sky reflection based on reflection ray vector R
      vec3 R = reflect(-V, N);
      float skyAngle = clamp(R.y * 0.85 + 0.15, 0.0, 1.0);
      vec3 naturalSky = mix(vec3(0.80, 0.90, 0.95), vec3(0.48, 0.72, 0.88), skyAngle);
      vec3 reflectedSky = mix(naturalSky, uColorHighlight, 0.35);

      // Blend deep water body with reflected sky across wave ripples
      vec3 surfaceColor = mix(waterBodyColor, reflectedSky, fresnel);
      finalColor = surfaceColor + specularColor;

      // Realistic water transparency: clear in shallows, dense in deep channel
      float transparency = mix(0.55, uOpacity, depthFactor);
      finalAlpha = clamp(transparency + fresnel * 0.35, 0.50, 0.95);
    } else {
      // UNDERWATER LOOKING UP AT SURFACE
      // Total Internal Reflection (TIR) at critical angles (Snell's window)
      float criticalAngleFactor = smoothstep(0.45, 0.85, NdotV);
      vec3 snellSkyColor = mix(uColorHighlight, vec3(0.70, 0.88, 0.95), 0.25);
      vec3 underReflect = mix(uColorDeep * 0.70, snellSkyColor, criticalAngleFactor);

      // Subtle natural wave glint without any artificial caustic patterns
      float underGlint = pow(NdotH, 48.0) * 0.65;
      finalColor = underReflect + uColorSunGlint * underGlint + (waterBodyColor * 0.25);
      finalAlpha = clamp(0.74 + (1.0 - criticalAngleFactor) * 0.20, 0.65, 0.92);
    }

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export const WaterSurface: React.FC<WaterSurfaceProps> = ({
  geometry,
  config = DEFAULT_RIVER_WATER_CONFIG,
  sunPosition = [100, 150, 100],
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => {
    return {
      uTime: { value: 0 },
      uFlowSpeed: { value: config.flowSpeed },
      uWaveScale: { value: config.waveScale },
      uWaveSpeed: { value: config.waveSpeed },
      uWaveHeight: { value: config.waveHeight },
      uFresnelPower: { value: config.fresnelPower },
      uRoughness: { value: config.roughness },
      uOpacity: { value: config.opacity },
      uColorShallow: { value: new THREE.Color(config.colors.shallow) },
      uColorDeep: { value: new THREE.Color(config.colors.deep) },
      uColorHighlight: { value: new THREE.Color(config.colors.highlight) },
      uColorSunGlint: { value: new THREE.Color(config.colors.sunGlint) },
      uSunPosition: { value: new THREE.Vector3(...sunPosition).normalize() },
      uCameraPos: { value: new THREE.Vector3() },
    };
  }, [config, sunPosition]);

  useFrame((state, delta) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value += delta;
    materialRef.current.uniforms.uCameraPos.value.copy(state.camera.position);
  });

  return (
    <mesh
      name={`WaterSurface-${config.id}`}
      geometry={geometry}
      position={[0, 0, 0]}
      renderOrder={10} // Render after opaque terrain to ensure proper transparency blending
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={WATER_VERTEX_SHADER}
        fragmentShader={WATER_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
