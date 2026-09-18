import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { WeaponId } from '../../types/game';
import { WEAPON_SPAWNS } from '../../config/constants';
import { inputManager } from '../../game/input/InputManager';
import { Shield, Crosshair as CrosshairIcon } from 'lucide-react';
import { Minimap } from './Minimap';
import { LargeMapModal } from './LargeMapModal';
import { MapSelectorModal } from './MapSelectorModal';

interface TacticalHUDProps {
  nearbyWeapon: { id: WeaponId; name: string } | null;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({ nearbyWeapon }) => {
  const state = useGameState();
  const activeId = state.activePlayerId;
  const activePlayer = state.players[activeId];
  const p1 = state.players.player1;
  const p2 = state.players.player2;

  // Modals state
  const [isLargeMapOpen, setIsLargeMapOpen] = useState(false);
  const [isMapSelectorOpen, setIsMapSelectorOpen] = useState(false);

  // M key listener to toggle Large Map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        if (!isMapSelectorOpen) {
          setIsLargeMapOpen((prev) => {
            const next = !prev;
            if (next) {
              document.exitPointerLock?.();
            } else {
              inputManager.requestLock();
            }
            return next;
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapSelectorOpen]);

  // Hit indicator pulse
  const [recentHit, setRecentHit] = useState(false);
  useEffect(() => {
    if (state.hitFeedbacks.length > 0) {
      setRecentHit(true);
      const timer = setTimeout(() => setRecentHit(false), 120);
      return () => clearTimeout(timer);
    }
  }, [state.hitFeedbacks.length]);

  // Pointer lock / Pause state
  const [isLocked, setIsLocked] = useState(false);
  useEffect(() => {
    return inputManager.onLockChange((locked) => {
      setIsLocked(locked);
    });
  }, []);

  // Check if debug mode is active via env or ?debug=1
  const isDebugMode =
    typeof window !== 'undefined' &&
    (window.location.search.includes('debug=1') ||
      import.meta.env.VITE_GAME_DEBUG === 'true');

  // Active weapon definition
  const activeWeaponDef = activePlayer.equippedWeapon
    ? WEAPON_SPAWNS[activePlayer.equippedWeapon]
    : null;

  const activeHpPercent = Math.max(0, Math.min(100, (activePlayer.health / 100) * 100));
  const activeHpColor =
    activeHpPercent > 60 ? '#10b981' : activeHpPercent > 30 ? '#f59e0b' : '#ef4444';

  const stanceLabel = activePlayer.isCrouching
    ? 'CROUCH'
    : activePlayer.isSprinting
    ? 'SPRINT'
    : 'STAND';

  const isTabScoreboard = inputManager.state.scoreboard;

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-6">
      {/* ======================================================== */}
      {/* TOP HEADER: MINIMAL COMPACT STATUS & TACTICAL MINIMAP */}
      {/* ======================================================== */}
      <div className="w-full flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950/60 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider text-slate-300 uppercase">TACTICAL SECTOR</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">LIVE COMBAT</span>
          </div>

          {/* Small Stance Indicator */}
          <div className="self-start px-2.5 py-1 rounded-md bg-slate-950/60 border border-slate-800/80 text-[10px] font-mono font-bold text-slate-400 tracking-widest uppercase">
            STANCE: <span className="text-cyan-400">{stanceLabel}</span>
          </div>
        </div>

        {/* Top-Right Tactical Minimap */}
        <Minimap
          onOpenLargeMap={() => {
            document.exitPointerLock?.();
            setIsLargeMapOpen(true);
          }}
          onOpenMapSelector={() => {
            document.exitPointerLock?.();
            setIsMapSelectorOpen(true);
          }}
        />
      </div>

      {/* ======================================================== */}
      {/* CENTER: MINIMAL TACTICAL CROSSHAIR (READY STATE ONLY) */}
      {/* ======================================================== */}
      {activePlayer.equippedWeapon && activePlayer.weaponState === 'ready' && !activePlayer.isDead && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative flex items-center justify-center">
            {/* Center Dot */}
            <div
              style={{
                width: '3px',
                height: '3px',
                backgroundColor: recentHit ? '#ef4444' : '#ffffff',
                borderRadius: '50%',
                boxShadow: recentHit ? '0 0 8px #ef4444' : '0 0 4px #ffffff',
              }}
            />
            {/* Hairline Ticks */}
            <div
              style={{
                position: 'absolute',
                top: activePlayer.isAiming ? '-7px' : '-13px',
                width: '1.5px',
                height: activePlayer.isAiming ? '4px' : '6px',
                backgroundColor: recentHit ? '#ef4444' : 'rgba(255,255,255,0.85)',
                transition: 'top 0.1s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: activePlayer.isAiming ? '-7px' : '-13px',
                width: '1.5px',
                height: activePlayer.isAiming ? '4px' : '6px',
                backgroundColor: recentHit ? '#ef4444' : 'rgba(255,255,255,0.85)',
                transition: 'bottom 0.1s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: activePlayer.isAiming ? '-7px' : '-13px',
                width: activePlayer.isAiming ? '4px' : '6px',
                height: '1.5px',
                backgroundColor: recentHit ? '#ef4444' : 'rgba(255,255,255,0.85)',
                transition: 'left 0.1s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: activePlayer.isAiming ? '-7px' : '-13px',
                width: activePlayer.isAiming ? '4px' : '6px',
                height: '1.5px',
                backgroundColor: recentHit ? '#ef4444' : 'rgba(255,255,255,0.85)',
                transition: 'right 0.1s ease',
              }}
            />

            {/* Hitmarker Flash Ticks */}
            {recentHit && (
              <div className="absolute w-4 h-4 border-2 border-red-500 rotate-45 pointer-events-none" />
            )}
          </div>
        </div>
      )}

      {/* Contextual Pickup Prompt: [PICK UP] E */}
      {nearbyWeapon && !activePlayer.isDead && (
        <div className="self-center flex flex-col items-center mb-16 animate-bounce">
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-700/90 text-slate-100 shadow-2xl backdrop-blur-md flex items-center gap-2 font-mono text-xs">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black border border-emerald-500/40">
              E
            </span>
            <span className="text-slate-400 font-bold">[PICK UP]</span>
            <span className="font-bold text-white uppercase">{nearbyWeapon.name}</span>
          </div>
        </div>
      )}

      {/* Contextual Ready Prompt when weapon is Holstered */}
      {activePlayer.equippedWeapon && activePlayer.weaponState === 'holstered' && !nearbyWeapon && !activePlayer.isDead && (
        <div className="self-center flex flex-col items-center mb-16">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-cyan-500/30 text-slate-300 shadow-2xl backdrop-blur-md flex items-center gap-2 font-mono text-xs animate-pulse">
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-black border border-cyan-500/50">
              Q
            </span>
            <span className="text-cyan-200 font-bold tracking-wide">[READY WEAPON]</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BOTTOM: COMPACT TACTICAL HUD */}
      {/* ======================================================== */}
      <div className="w-full flex items-end justify-between font-mono">
        {/* Operator Health Card (Bottom Left) */}
        <div className="p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 shadow-2xl min-w-[200px]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold tracking-wider text-slate-300">
                {activePlayer.name}
              </span>
            </div>
            <span
              className="font-black text-sm"
              style={{ color: activePlayer.isDead ? '#ef4444' : activeHpColor }}
            >
              {activePlayer.isDead ? 'KIA' : `${activePlayer.health} HP`}
            </span>
          </div>

          {/* Clean Segmented Health Bar */}
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${activeHpPercent}%`,
                backgroundColor: activePlayer.isDead ? '#475569' : activeHpColor,
              }}
            />
          </div>
        </div>

        {/* Weapon Card (Bottom Right) */}
        <div className="p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 shadow-2xl min-w-[210px] text-right">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center justify-end gap-1">
            <CrosshairIcon className="w-3 h-3 text-slate-400" />
            <span>WEAPON</span>
          </div>

          {activeWeaponDef ? (
            <div>
              <div className="text-sm font-black text-white tracking-wide uppercase">
                {activeWeaponDef.name}
              </div>

              {/* Status or Ammo and Toggle Prompt */}
              {activePlayer.weaponState === 'holstered' ? (
                <div>
                  <div className="text-xs mt-0.5 flex items-center justify-end gap-1.5 text-amber-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>HOLSTERED</span>
                  </div>
                  <div className="text-[10px] text-cyan-400 mt-1 flex items-center justify-end gap-1 font-bold">
                    <span className="px-1 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono">
                      [Q]
                    </span>
                    <span>READY</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs mt-0.5 flex items-center justify-end gap-2">
                    {activePlayer.isReloading ? (
                      <span className="text-amber-400 font-bold animate-pulse">RELOADING...</span>
                    ) : (
                      <>
                        <span
                          className={`font-black ${
                            activePlayer.magazine <= 5 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {activePlayer.magazine}
                        </span>
                        <span className="text-slate-500">/</span>
                        <span className="text-slate-300">{activePlayer.maxMagazine}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1 font-bold">
                    <span className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                      [Q]
                    </span>
                    <span>HOLSTER</span>
                  </div>
                </div>
              )}

              {/* Weapon Slot Indicators (1 & 2) */}
              <div className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-end gap-2">
                <span
                  className={
                    activePlayer.activeSlot === 1
                      ? 'text-cyan-400 font-bold'
                      : activePlayer.inventory.slot1
                      ? 'text-slate-400'
                      : 'text-slate-700'
                  }
                >
                  [1] {activePlayer.inventory.slot1 ? 'PRIMARY' : 'EMPTY'}
                </span>
                <span
                  className={
                    activePlayer.activeSlot === 2
                      ? 'text-cyan-400 font-bold'
                      : activePlayer.inventory.slot2
                      ? 'text-slate-400'
                      : 'text-slate-700'
                  }
                >
                  [2] {activePlayer.inventory.slot2 ? 'SECONDARY' : 'EMPTY'}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-amber-400">UNARMED</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Approach weapon & press [E]</div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB HELD: TACTICAL SCOREBOARD OVERLAY */}
      {/* ======================================================== */}
      {isTabScoreboard && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-950/90 border border-slate-700 shadow-2xl font-mono text-slate-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <span className="font-black text-sm tracking-wider text-slate-100 uppercase">
                TACTICAL ENGAGEMENT SCOREBOARD
              </span>
              <span className="text-xs text-emerald-400 font-bold">ROUND ACTIVE</span>
            </div>

            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800/80">
                  <th className="pb-2">COMBATANT</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2">HEALTH</th>
                  <th className="pb-2">WEAPON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                <tr className={activeId === 'player1' ? 'text-cyan-300 font-bold' : ''}>
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>PLAYER 1 {activeId === 'player1' ? '(YOU)' : ''}</span>
                  </td>
                  <td className="py-2.5">{p1.isDead ? 'ELIMINATED' : 'ACTIVE'}</td>
                  <td className="py-2.5">{p1.isDead ? '0' : p1.health} / 100</td>
                  <td className="py-2.5">
                    {p1.equippedWeapon ? WEAPON_SPAWNS[p1.equippedWeapon].name : 'UNARMED'}
                  </td>
                </tr>
                <tr className={activeId === 'player2' ? 'text-rose-300 font-bold' : ''}>
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>PLAYER 2 {activeId === 'player2' ? '(YOU)' : ''}</span>
                  </td>
                  <td className="py-2.5">{p2.isDead ? 'ELIMINATED' : 'ACTIVE'}</td>
                  <td className="py-2.5">{p2.isDead ? '0' : p2.health} / 100</td>
                  <td className="py-2.5">
                    {p2.equippedWeapon ? WEAPON_SPAWNS[p2.equippedWeapon].name : 'UNARMED'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PAUSE / CLICK TO RESUME OVERLAY (when pointer lock is disengaged) */}
      {/* ======================================================== */}
      {!isLocked && state.matchState.status === 'playing' && !isLargeMapOpen && !isMapSelectorOpen && (
        <div
          onClick={() => inputManager.requestLock()}
          className="fixed inset-0 z-35 flex items-center justify-center bg-black/50 backdrop-blur-[2px] pointer-events-auto cursor-pointer"
        >
          <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-700 shadow-2xl text-center max-w-xs font-mono">
            <div className="text-sm font-black uppercase text-white mb-1 tracking-wider">
              GAME PAUSED
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Click anywhere in the viewport to resume tactical mouse control.
            </p>
            <div className="py-2 px-4 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold uppercase tracking-wider">
              CLICK TO RESUME
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* END-OF-MATCH MILITARY VICTORY / RESTART OVERLAY */}
      {/* ======================================================== */}
      {state.matchState.status === 'ended' && state.matchState.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md pointer-events-auto">
          <div className="relative max-w-sm w-full mx-4 p-6 rounded-2xl bg-slate-900/90 border border-slate-700 text-center flex flex-col items-center shadow-2xl font-mono">
            <div className="text-xs font-bold tracking-widest text-red-400 uppercase mb-2">
              {state.matchState.eliminationMessage || 'HOSTILE ELIMINATED'}
            </div>
            <h2
              className="text-3xl font-black tracking-wider uppercase mb-2"
              style={{
                color: state.matchState.winner === 'player1' ? '#38bdf8' : '#f43f5e',
              }}
            >
              {state.matchState.winner === 'player1' ? 'PLAYER 1' : 'PLAYER 2'} VICTORY
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Area secured. Combat simulation concluded.
            </p>
            <button
              onClick={() => {
                state.restartMatch();
                inputManager.requestLock();
              }}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wider uppercase text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              RESTART MATCH
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DEVELOPMENT DEBUG CONTROLS (Only visible if VITE_GAME_DEBUG=true or ?debug=1) */}
      {/* ======================================================== */}
      {isDebugMode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/95 border border-slate-700 backdrop-blur-md text-[11px] font-mono shadow-2xl">
          <span className="text-slate-400 font-bold">DEV:</span>
          <button
            id="btn-p1-pickup"
            onClick={() => {
              state.setActivePlayer('player1');
              state.pickupWeapon('player1', 'gun1');
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
          >
            P1 Pick Gun 1
          </button>
          <button
            id="btn-p1-shoot"
            onClick={() => {
              if (!state.players.player1.equippedWeapon) {
                state.pickupWeapon('player1', 'gun1');
              }
              state.applyDamage('player2', 'player1');
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
          >
            P1 Shoot P2 (-34)
          </button>
          <span className="text-slate-600">|</span>
          <button
            id="btn-p2-pickup"
            onClick={() => {
              state.setActivePlayer('player2');
              state.pickupWeapon('player2', 'gun2');
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 cursor-pointer"
          >
            P2 Pick Gun 2
          </button>
          <button
            id="btn-p2-shoot"
            onClick={() => {
              if (!state.players.player2.equippedWeapon) {
                state.pickupWeapon('player2', 'gun2');
              }
              state.applyDamage('player1', 'player2');
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 cursor-pointer"
          >
            P2 Shoot P1 (-34)
          </button>
          <span className="text-slate-600">|</span>
          <button
            id="btn-switch-player"
            onClick={() => state.toggleActivePlayer()}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer"
          >
            Switch
          </button>
          <button
            id="btn-restart"
            onClick={() => state.restartMatch()}
            className="px-2 py-0.5 rounded bg-emerald-900/80 hover:bg-emerald-800 text-emerald-300 cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TACTICAL MAP OVERLAYS */}
      {/* ======================================================== */}
      <LargeMapModal
        isOpen={isLargeMapOpen}
        onClose={() => {
          setIsLargeMapOpen(false);
          inputManager.requestLock();
        }}
      />

      <MapSelectorModal
        isOpen={isMapSelectorOpen}
        onClose={() => {
          setIsMapSelectorOpen(false);
          inputManager.requestLock();
        }}
      />
    </div>
  );
};
