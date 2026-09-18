import React from 'react';
import { MatchState } from '../types/game';
import { gameState } from '../systems/gameState';

interface WinnerOverlayProps {
  matchState: MatchState;
}

export const WinnerOverlay: React.FC<WinnerOverlayProps> = ({ matchState }) => {
  if (matchState.status !== 'ended' || !matchState.winner) {
    return null;
  }

  const winnerName = matchState.winner === 'player1' ? 'PLAYER 1' : 'PLAYER 2';
  const winnerColor = matchState.winner === 'player1' ? '#06b6d4' : '#f43f5e';

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    gameState.restartMatch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative max-w-md w-full mx-4 p-8 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl text-center flex flex-col items-center">
        {/* Glowing aura */}
        <div
          className="absolute -inset-1 rounded-2xl opacity-40 blur-xl pointer-events-none"
          style={{ backgroundColor: winnerColor }}
        />

        {/* Elimination Alert */}
        {matchState.eliminationMessage && (
          <div className="text-red-400 font-bold tracking-widest text-sm uppercase mb-2 px-3 py-1 rounded bg-red-950/60 border border-red-800">
            {matchState.eliminationMessage}
          </div>
        )}

        {/* Victory Header */}
        <h1
          className="text-4xl sm:text-5xl font-black tracking-wider uppercase my-3"
          style={{
            color: winnerColor,
            textShadow: `0 0 20px ${winnerColor}80`,
          }}
        >
          {winnerName} WINS
        </h1>

        <p className="text-slate-400 text-sm mb-8">
          Match concluded. All hostile combatants neutralized.
        </p>

        {/* Restart Match Button */}
        <button
          onClick={handleRestart}
          className="w-full py-4 px-6 rounded-xl font-black text-lg tracking-wider uppercase text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 transition-all shadow-lg hover:shadow-emerald-500/25 cursor-pointer border border-emerald-400/40"
        >
          RESTART MATCH
        </button>
      </div>
    </div>
  );
};
