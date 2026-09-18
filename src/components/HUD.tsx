import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { Crosshair } from './Crosshair';
import { HitFeedback } from './HitFeedback';
import { WinnerOverlay } from './WinnerOverlay';
import { WeaponId } from '../types/game';
import { WEAPON_SPAWNS } from '../config/constants';
import { Shield, Crosshair as CrosshairIcon, Zap, RefreshCw } from 'lucide-react';

interface HUDProps {
  nearbyWeapon: { id: WeaponId; name: string } | null;
}

export const HUD: React.FC<HUDProps> = ({ nearbyWeapon }) => {
  const state = useGameState();
  const activeId = state.activePlayerId;
  const activePlayer = state.players[activeId];
  const p1 = state.players.player1;
  const p2 = state.players.player2;

  // Track recent hit for crosshair flash
  const [recentHit, setRecentHit] = useState(false);
  useEffect(() => {
    if (state.hitFeedbacks.length > 0) {
      setRecentHit(true);
      const timer = setTimeout(() => setRecentHit(false), 140);
      return () => clearTimeout(timer);
    }
  }, [state.hitFeedbacks.length]);


  const activeWeaponDef = activePlayer.equippedWeapon
    ? WEAPON_SPAWNS[activePlayer.equippedWeapon]
    : null;

  const activeHpPercent = Math.max(0, Math.min(100, (activePlayer.health / 100) * 100));
  const activeHpColor =
    activeHpPercent > 60 ? '#10b981' : activeHpPercent > 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* ======================================================== */}
      {/* TOP HEADER: PLAYER 1 vs PLAYER 2 STATUS BARS */}
      {/* ======================================================== */}
      <div className="w-full flex items-center justify-between gap-4">
        {/* Player 1 Status Card */}
        <div
          className={`p-2 rounded-lg backdrop-blur-md transition-all max-w-[160px] w-full ${
            activeId === 'player1'
              ? 'bg-slate-900/90 border border-cyan-500 shadow-md shadow-cyan-500/20'
              : 'bg-slate-900/60 border border-slate-700/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-xs tracking-wider text-cyan-300">
                PLAYER 1 {activeId === 'player1' ? '(YOU)' : ''}
              </span>
            </div>
            <span
              className={`font-mono font-bold text-xs ${
                p1.isDead ? 'text-red-500' : 'text-slate-200'
              }`}
            >
              {p1.isDead ? 'KIA' : `${p1.health} HP`}
            </span>
          </div>

          {/* Health Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(0, p1.health)}%`,
                backgroundColor: p1.isDead
                  ? '#64748b'
                  : p1.health > 60
                  ? '#10b981'
                  : p1.health > 30
                  ? '#f59e0b'
                  : '#ef4444',
              }}
            />
          </div>
        </div>

        {/* Center Match Status & Switch Player Action */}
        <div className="flex flex-col items-center gap-1">
          <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-xs font-mono font-bold tracking-widest text-slate-300">
            VS MATCH
          </div>
          <button
            onClick={() => state.toggleActivePlayer()}
            className="pointer-events-auto px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-600 text-xs font-bold text-slate-200 flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            title="Switch controlling between Player 1 and Player 2 (or press Tab)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>SWITCH TO {activeId === 'player1' ? 'PLAYER 2' : 'PLAYER 1'} [TAB]</span>
          </button>
        </div>

        {/* Player 2 Status Card */}
        <div
          className={`p-2 rounded-lg backdrop-blur-md transition-all max-w-[160px] w-full ${
            activeId === 'player2'
              ? 'bg-slate-900/90 border border-rose-500 shadow-md shadow-rose-500/20'
              : 'bg-slate-900/60 border border-slate-700/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span className="font-bold text-xs tracking-wider text-rose-300">
                PLAYER 2 {activeId === 'player2' ? '(YOU)' : ''}
              </span>
            </div>
            <span
              className={`font-mono font-bold text-xs ${
                p2.isDead ? 'text-red-500' : 'text-slate-200'
              }`}
            >
              {p2.isDead ? 'KIA' : `${p2.health} HP`}
            </span>
          </div>

          {/* Health Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(0, p2.health)}%`,
                backgroundColor: p2.isDead
                  ? '#64748b'
                  : p2.health > 60
                  ? '#10b981'
                  : p2.health > 30
                  ? '#f59e0b'
                  : '#ef4444',
              }}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CENTER: WEAPON PICKUP PROMPT & CROSSHAIR */}
      {/* ======================================================== */}
      {activePlayer.equippedWeapon !== null && activePlayer.weaponState === 'ready' && !activePlayer.isDead && (
        <Crosshair
          isAiming={activePlayer.isAiming}
          hasWeapon={true}
          recentHit={recentHit}
        />
      )}

      <HitFeedback feedbacks={state.hitFeedbacks} />

      {/* Floating Weapon Pickup Prompt */}
      {nearbyWeapon && !activePlayer.isDead && (
        <div className="self-center flex flex-col items-center animate-bounce mb-8">
          <div className="px-5 py-2.5 rounded-xl bg-slate-900/95 border-2 border-emerald-400 text-slate-100 shadow-xl backdrop-blur-md flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-base flex items-center justify-center border border-emerald-400/50">
              E
            </span>
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                Press E to Pick Up
              </div>
              <div className="text-base font-black text-white">{nearbyWeapon.name}</div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BOTTOM HUD: LOCAL PLAYER STATUS & WEAPON */}
      {/* ======================================================== */}
      <div className="w-full flex items-end justify-between">
        {/* Local Player Health Widget */}
        <div className="p-4 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 shadow-2xl min-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold text-xs tracking-widest text-slate-300 uppercase">
                {activePlayer.name} HEALTH
              </span>
            </div>
            <span
              className="font-mono font-black text-lg"
              style={{ color: activePlayer.isDead ? '#ef4444' : activeHpColor }}
            >
              {activePlayer.isDead ? 'DEAD' : `${activePlayer.health} HP`}
            </span>
          </div>

          {/* Large Segmented Health Bar */}
          <div className="w-full h-4 bg-slate-950 rounded-lg overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full rounded-md transition-all duration-300"
              style={{
                width: `${activeHpPercent}%`,
                backgroundColor: activePlayer.isDead ? '#475569' : activeHpColor,
                boxShadow: activePlayer.isDead ? 'none' : `0 0 12px ${activeHpColor}80`,
              }}
            />
          </div>

          {/* Graphical Tick Bars: 3 chunks for 3 shots */}
          <div className="flex justify-between gap-1 mt-1 text-[10px] font-mono text-slate-500">
            <span className={activePlayer.health >= 34 ? 'text-emerald-400' : 'text-slate-600'}>
              [HIT 1: 66 HP]
            </span>
            <span className={activePlayer.health >= 1 ? 'text-amber-400' : 'text-slate-600'}>
              [HIT 2: 32 HP]
            </span>
            <span className={activePlayer.health === 0 ? 'text-rose-500 font-bold' : 'text-slate-600'}>
              [HIT 3: 0 HP]
            </span>
          </div>
        </div>

        {/* Current Equipped Weapon Card */}
        <div className="p-4 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 shadow-2xl min-w-[240px] text-right">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-end gap-1.5">
            <CrosshairIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>EQUIPPED WEAPON</span>
          </div>

          {activeWeaponDef ? (
            <div>
              <div
                className="text-xl font-black uppercase tracking-wide"
                style={{ color: activeWeaponDef.accentColor }}
              >
                {activeWeaponDef.name}
              </div>
              <div className="text-xs text-slate-300 mt-1 flex items-center justify-end gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {activePlayer.isAiming ? 'ADS AIMING' : 'HIPFIRE'}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Zap className="w-3 h-3" /> READY
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg font-bold text-amber-400">UNARMED</div>
              <div className="text-xs text-slate-400 mt-1">
                Walk near Gun 1 or Gun 2 & press [E]
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Winner Overlay Modal */}
      <WinnerOverlay matchState={state.matchState} />
    </div>
  );
};
