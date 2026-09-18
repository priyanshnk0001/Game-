import { useState, useEffect } from 'react';
import { gameState } from '../systems/gameState';

export function useGameState() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return gameState.subscribe(() => {
      setTick((t) => (t + 1) % 10000);
    });
  }, []);

  return gameState;
}
