import React, { useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { MAPS } from '../../config/maps';
import { MapId } from '../../types/game';
import { X, Globe, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { inputManager } from '../../game/input/InputManager';

interface MapSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MapSelectorModal: React.FC<MapSelectorModalProps> = ({ isOpen, onClose }) => {
  const state = useGameState();
  const activeMapId = state.activeMapId || 'battle-area';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectMap = (mapId: MapId) => {
    state.switchMap(mapId);
    onClose();
    setTimeout(() => {
      inputManager.requestLock();
    }, 100);
  };

  const mapList = Object.values(MAPS);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '860px',
          borderRadius: '16px',
          backgroundColor: '#090d16',
          border: '1.5px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(6, 182, 212, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'monospace',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid rgba(30, 41, 59, 0.8)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Globe style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.1em' }}>
                  TACTICAL DEPLOYMENT
                </span>
                <span style={{ color: '#475569' }}>|</span>
                <h2 style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                  SELECT BATTLE AREA
                </h2>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Choose an operational theater. Spawns, physical obstacles, and environmental conditions will calibrate instantly.
              </p>
            </div>
          </div>

          <button
            id="btn-close-mapselector"
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* 3 Map Cards Grid */}
        <div
          style={{
            padding: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
          }}
        >
          {mapList.map((map) => {
            const isActive = map.id === activeMapId;

            return (
              <div
                key={map.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '12px',
                  border: isActive ? '1.5px solid #06b6d4' : '1px solid #1e293b',
                  backgroundColor: isActive ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.55)',
                  boxShadow: isActive ? '0 0 24px rgba(6, 182, 212, 0.25)' : '0 4px 16px rgba(0, 0, 0, 0.4)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Active Indicator Top Tag */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(8, 51, 68, 0.95)',
                      border: '1px solid rgba(6, 182, 212, 0.6)',
                      color: '#67e8f9',
                      fontSize: '9px',
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 style={{ width: '12px', height: '12px', color: '#38bdf8' }} />
                    <span>ACTIVE THEATER</span>
                  </div>
                )}

                {/* Tactical Card Visual Thumbnail */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '125px',
                    background:
                      map.id === 'jungle-ops'
                        ? 'linear-gradient(135deg, #022c22, #064e3b, #134e4a)'
                        : map.id === 'snow-ops'
                        ? 'linear-gradient(135deg, #0f172a, #082f49, #1e3a8a)'
                        : 'linear-gradient(135deg, #0f172a, #1e293b, #064e3b)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(30, 41, 59, 0.8)',
                  }}
                >
                  {/* Sector Code Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 800,
                        border: '1px solid rgba(56, 189, 248, 0.5)',
                        backgroundColor: 'rgba(8, 47, 73, 0.6)',
                        color: '#38bdf8',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {map.sectorCode}
                    </span>
                    <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>
                      {map.environmentType.toUpperCase()}
                    </span>
                  </div>

                  {/* Map Name Heading */}
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', margin: 0 }}>
                      {map.name}
                    </h3>
                    <p style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600, margin: '2px 0 0 0' }}>{map.tagline}</p>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
                    {map.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: '#94a3b8',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #1e293b',
                      }}
                    >
                      <span>KEY OBJECTIVES:</span>
                      <strong style={{ color: '#f8fafc' }}>{map.sectors.length} Sectors</strong>
                    </div>

                    <button
                      id={`btn-deploy-${map.id}`}
                      onClick={() => handleSelectMap(map.id)}
                      disabled={isActive}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: isActive ? 'default' : 'pointer',
                        backgroundColor: isActive ? 'rgba(8, 51, 68, 0.6)' : '#0891b2',
                        border: isActive ? '1px solid rgba(6, 182, 212, 0.4)' : 'none',
                        color: isActive ? '#67e8f9' : '#ffffff',
                        boxShadow: isActive ? 'none' : '0 4px 14px rgba(8, 145, 178, 0.4)',
                        transition: 'background-color 0.15s, transform 0.1s',
                      }}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                          <span>CURRENTLY DEPLOYED</span>
                        </>
                      ) : (
                        <>
                          <span>DEPLOY TO AREA</span>
                          <ArrowRight style={{ width: '14px', height: '14px' }} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderTop: '1px solid rgba(30, 41, 59, 0.8)',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
            <span>SWITCHING MAP WILL RE-CENTER OPERATOR TO AIRDROP INSERTION POINT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                fontSize: '10px',
              }}
            >
              ESC
            </kbd>
            <span>CANCEL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
