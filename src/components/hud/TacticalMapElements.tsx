import React from 'react';
import { WorldMapObject, WorldLinearFeature, WorldPOI } from '../../game/world/WorldObjectRegistry';

interface TacticalWorldObjectProps {
  object: WorldMapObject;
  project: (wx: number, wz: number) => [number, number];
  scale: number; // pixels per world meter
}

export const TacticalWorldObject: React.FC<TacticalWorldObjectProps> = React.memo(({ object, project, scale }) => {
  const [cx, cy] = project(object.position[0], object.position[2]);
  const w = Math.max(1.2, object.size[0] * scale);
  const h = Math.max(1.2, object.size[2] * scale);
  const rotDeg = (object.rotationY * 180) / Math.PI;

  switch (object.type) {
    case 'building': {
      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotDeg})`}>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#1e293b"
            stroke="#06b6d4"
            strokeWidth={Math.max(0.6, 0.22 * scale)}
            rx={Math.max(0.5, 0.2 * scale)}
          />
          {w > 6 && h > 6 && (
            <rect
              x={-w / 2 + 1}
              y={-h / 2 + 1}
              width={Math.max(1.5, w * 0.35)}
              height={Math.max(1.5, h * 0.35)}
              fill="#0f172a"
              stroke="#475569"
              strokeWidth={0.5}
            />
          )}
          {object.label && w > 8 && (
            <text
              x={0}
              y={Math.min(2, h * 0.18)}
              fill="#e2e8f0"
              fontSize={Math.max(3.2, Math.min(6.5, w * 0.25))}
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {object.label}
            </text>
          )}
        </g>
      );
    }

    case 'container': {
      const isRust = object.id.includes('bravo') || object.id.includes('rust');
      const isFrost = object.id.includes('snow') || object.id.includes('arctic');
      const fill = isFrost ? '#1d4ed8' : isRust ? '#7c2d12' : '#1e3a5f';
      const stroke = isFrost ? '#93c5fd' : isRust ? '#fb923c' : '#38bdf8';

      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotDeg})`}>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill={fill}
            stroke={stroke}
            strokeWidth={Math.max(0.6, 0.2 * scale)}
            rx={0.5}
          />
          {w > 5 && (
            <>
              <line x1={-w * 0.25} y1={-h / 2} x2={-w * 0.25} y2={h / 2} stroke={stroke} strokeWidth={0.5} opacity={0.8} />
              <line x1={w * 0.25} y1={-h / 2} x2={w * 0.25} y2={h / 2} stroke={stroke} strokeWidth={0.5} opacity={0.8} />
            </>
          )}
          {object.label && (
            <text
              x={0}
              y={1.8}
              fill="#ffffff"
              fontSize={Math.max(3.0, Math.min(5.5, w * 0.22))}
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {object.label}
            </text>
          )}
        </g>
      );
    }

    case 'bunker': {
      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotDeg})`}>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#a16207"
            stroke="#fde047"
            strokeWidth={Math.max(0.6, 0.18 * scale)}
            rx={Math.min(w, h) * 0.4}
          />
        </g>
      );
    }

    case 'barrier': {
      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotDeg})`}>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#64748b"
            stroke="#cbd5e1"
            strokeWidth={Math.max(0.5, 0.15 * scale)}
            rx={0.4}
          />
        </g>
      );
    }

    case 'wall': {
      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotDeg})`}>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#334155"
            stroke="#38bdf8"
            strokeWidth={Math.max(0.6, 0.18 * scale)}
          />
        </g>
      );
    }

    case 'crate': {
      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotDeg})`}>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#047857"
            stroke="#34d399"
            strokeWidth={Math.max(0.5, 0.15 * scale)}
            rx={0.4}
          />
          <line x1={-w / 2} y1={-h / 2} x2={w / 2} y2={h / 2} stroke="#34d399" strokeWidth={0.4} opacity={0.5} />
        </g>
      );
    }

    case 'pillar': {
      const r = Math.max(1.8, Math.max(w, h) / 2);
      return (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#334155"
          stroke="#facc15"
          strokeWidth={Math.max(0.6, 0.2 * scale)}
        />
      );
    }

    case 'rock': {
      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotDeg})`}>
          <ellipse
            cx={0}
            cy={0}
            rx={Math.max(1.5, w / 2)}
            ry={Math.max(1.5, h / 2)}
            fill="#475569"
            stroke="#94a3b8"
            strokeWidth={Math.max(0.5, 0.15 * scale)}
          />
        </g>
      );
    }

    case 'bridge': {
      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotDeg})`}>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#a16207"
            stroke="#fde047"
            strokeWidth={Math.max(0.7, 0.2 * scale)}
            rx={0.5}
          />
          <line x1={-w / 2} y1={-h * 0.25} x2={w / 2} y2={-h * 0.25} stroke="#451a03" strokeWidth={0.6} />
          <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke="#451a03" strokeWidth={0.6} />
          <line x1={-w / 2} y1={h * 0.25} x2={w / 2} y2={h * 0.25} stroke="#451a03" strokeWidth={0.6} />
          {object.label && (
            <text x={0} y={1.8} fill="#fef08a" fontSize={Math.max(3, Math.min(5, w * 0.22))} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              {object.label}
            </text>
          )}
        </g>
      );
    }

    case 'tree': {
      const treeRadius = Math.max(1.4, (object.size[0] / 2) * scale);
      let treeFill = '#14532d';
      let treeStroke = '#22c55e';

      if (object.subType === 'jacaranda') {
        treeFill = '#581c87';
        treeStroke = '#c084fc';
      } else if (object.subType === 'redmaple') {
        treeFill = '#7f1d1d';
        treeStroke = '#f87171';
      } else if (object.subType === 'conifer' || object.subType === 'pine') {
        treeFill = '#164e63';
        treeStroke = '#7dd3fc';
      } else if (object.subType === 'palm') {
        treeFill = '#065f46';
        treeStroke = '#10b981';
      } else if (object.subType === 'banyan') {
        treeFill = '#166534';
        treeStroke = '#4ade80';
      }

      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <circle
            cx={0}
            cy={0}
            r={treeRadius}
            fill={treeFill}
            stroke={treeStroke}
            strokeWidth={Math.max(0.5, 0.15 * scale)}
            opacity={0.88}
          />
          <circle
            cx={0}
            cy={0}
            r={treeRadius * 0.35}
            fill={treeStroke}
            opacity={0.65}
          />
        </g>
      );
    }

    default:
      return null;
  }
});

interface TacticalLinearFeatureProps {
  feature: WorldLinearFeature;
  project: (wx: number, wz: number) => [number, number];
  scale: number;
}

export const TacticalLinearFeature: React.FC<TacticalLinearFeatureProps> = React.memo(({ feature, project, scale }) => {
  if (feature.points.length < 2) return null;

  const pts = feature.points.map(([wx, wz]) => project(wx, wz));
  const d = pts.reduce((acc, [x, y], idx) => {
    return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  if (feature.type === 'river') {
    const strokeW = Math.max(2.5, feature.width * scale);
    return (
      <g key={feature.id}>
        <path d={d} stroke="#0e7490" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.65} />
        <path d={d} stroke="#155e75" strokeWidth={strokeW * 0.45} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85} />
      </g>
    );
  }

  // Road
  const strokeW = Math.max(1.8, feature.width * scale);
  return (
    <g key={feature.id}>
      <path d={d} stroke="#141d2c" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path
        d={d}
        stroke="#475569"
        strokeWidth={Math.max(0.6, 0.15 * scale)}
        strokeDasharray={`${Math.max(2, 1.2 * scale)},${Math.max(1.5, 0.9 * scale)}`}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
});

interface TacticalPOIProps {
  poi: WorldPOI;
  project: (wx: number, wz: number) => [number, number];
}

export const TacticalPOI: React.FC<TacticalPOIProps> = React.memo(({ poi, project }) => {
  const [px, py] = project(poi.x, poi.z);
  return (
    <g transform={`translate(${px}, ${py})`}>
      <circle cx={0} cy={0} r={1.5} fill="#fde047" opacity={0.6} />
      <text
        x={0}
        y={-2.5}
        fill="#fde047"
        fontSize={4.2}
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
        stroke="#090d16"
        strokeWidth={0.8}
        paintOrder="stroke"
      >
        {poi.label}
      </text>
    </g>
  );
});
