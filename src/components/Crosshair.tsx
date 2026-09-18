import React from 'react';

interface CrosshairProps {
  isAiming: boolean;
  hasWeapon: boolean;
  recentHit: boolean;
}

export const Crosshair: React.FC<CrosshairProps> = ({
  isAiming,
  hasWeapon,
  recentHit,
}) => {
  // If player doesn't have a weapon, hide crosshair completely
  if (!hasWeapon) {
    return null;
  }

  const spread = isAiming ? 8 : 16;
  const color = recentHit ? '#ef4444' : isAiming ? '#38bdf8' : '#ffffff';

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-20">
      <div className="relative flex items-center justify-center">
        {/* Center Target Dot */}
        <div
          style={{
            width: '4px',
            height: '4px',
            backgroundColor: color,
            borderRadius: '50%',
            boxShadow: `0 0 6px ${color}`,
            transition: 'background-color 0.1s ease',
          }}
        />

        {/* Top Tick */}
        <div
          style={{
            position: 'absolute',
            top: `-${spread + 8}px`,
            width: '2px',
            height: isAiming ? '7px' : '9px',
            backgroundColor: color,
            transition: 'top 0.12s ease, background-color 0.1s ease',
          }}
        />

        {/* Bottom Tick */}
        <div
          style={{
            position: 'absolute',
            bottom: `-${spread + 8}px`,
            width: '2px',
            height: isAiming ? '7px' : '9px',
            backgroundColor: color,
            transition: 'bottom 0.12s ease, background-color 0.1s ease',
          }}
        />

        {/* Left Tick */}
        <div
          style={{
            position: 'absolute',
            left: `-${spread + 8}px`,
            width: isAiming ? '7px' : '9px',
            height: '2px',
            backgroundColor: color,
            transition: 'left 0.12s ease, background-color 0.1s ease',
          }}
        />

        {/* Right Tick */}
        <div
          style={{
            position: 'absolute',
            right: `-${spread + 8}px`,
            width: isAiming ? '7px' : '9px',
            height: '2px',
            backgroundColor: color,
            transition: 'right 0.12s ease, background-color 0.1s ease',
          }}
        />

        {/* Hit X-Marker on hit */}
        {recentHit && (
          <div className="absolute animate-ping">
            <div className="w-5 h-5 border-2 border-red-500 rotate-45" />
          </div>
        )}
      </div>
    </div>
  );
};
