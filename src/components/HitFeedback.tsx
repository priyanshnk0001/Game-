import React from 'react';
import { HitFeedbackData } from '../types/game';

interface HitFeedbackProps {
  feedbacks: HitFeedbackData[];
}

export const HitFeedback: React.FC<HitFeedbackProps> = ({ feedbacks }) => {
  const now = Date.now();
  // Filter items from last 900ms
  const activeFeedbacks = feedbacks.filter((f) => now - f.timestamp < 900);

  if (activeFeedbacks.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div className="relative">
        {activeFeedbacks.map((f, idx) => (
          <div
            key={f.id}
            style={{
              position: 'absolute',
              top: `${-40 - idx * 24}px`,
              left: `${20 + idx * 10}px`,
              fontSize: f.isFatal ? '24px' : '18px',
              fontWeight: 900,
              fontFamily: 'monospace',
              color: f.isFatal ? '#ef4444' : '#fbbf24',
              textShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 12px currentColor',
              animation: 'fadeFloatUp 0.8s ease-out forwards',
            }}
          >
            -{f.damage} {f.isFatal ? 'KILL' : ''}
          </div>
        ))}
      </div>
    </div>
  );
};
