// Authoritative WebSocket Game Server for 2-Player Tactical Shooter
// Run with: node server.js

import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`[Shooter Server] Authoritative WebSocket server listening on ws://localhost:${PORT}`);

const PLAYER_MAX_HEALTH = 100;
const WEAPON_DAMAGE = 34;

const initialState = () => ({
  players: {
    player1: {
      id: 'player1',
      name: 'PLAYER 1',
      position: [-14, 0, 0],
      rotationY: 0,
      pitch: 0,
      health: PLAYER_MAX_HEALTH,
      isDead: false,
      equippedWeapon: null,
      isAiming: false,
      color: '#06b6d4',
    },
    player2: {
      id: 'player2',
      name: 'PLAYER 2',
      position: [14, 0, 0],
      rotationY: Math.PI,
      pitch: 0,
      health: PLAYER_MAX_HEALTH,
      isDead: false,
      equippedWeapon: null,
      isAiming: false,
      color: '#f43f5e',
    },
  },
  groundWeapons: {
    gun1: { id: 'gun1', position: [-5, 0.5, 5], isPickedUp: false, pickedUpBy: null },
    gun2: { id: 'gun2', position: [5, 0.5, -5], isPickedUp: false, pickedUpBy: null },
  },
  matchState: {
    status: 'playing',
    winner: null,
    eliminationMessage: null,
  },
});

let state = initialState();
const sockets = new Map(); // ws -> playerId

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  // Assign available player slot
  let assignedRole = null;
  const activeRoles = Array.from(sockets.values());

  if (!activeRoles.includes('player1')) {
    assignedRole = 'player1';
  } else if (!activeRoles.includes('player2')) {
    assignedRole = 'player2';
  } else {
    assignedRole = 'spectator';
  }

  sockets.set(ws, assignedRole);
  console.log(`[Server] Client connected. Assigned role: ${assignedRole}`);

  // Send initial welcome & full state
  ws.send(
    JSON.stringify({
      type: 'INIT',
      role: assignedRole,
      state,
    })
  );

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const senderRole = sockets.get(ws);
      if (!senderRole || senderRole === 'spectator') return;

      switch (data.type) {
        case 'TRANSFORM': {
          const p = state.players[senderRole];
          if (p && !p.isDead) {
            p.position = data.position;
            p.rotationY = data.rotationY;
            p.pitch = data.pitch;
            p.isAiming = !!data.isAiming;

            // Broadcast transform to opponent
            broadcast({
              type: 'PLAYER_TRANSFORM',
              playerId: senderRole,
              position: p.position,
              rotationY: p.rotationY,
              pitch: p.pitch,
              isAiming: p.isAiming,
            });
          }
          break;
        }

        case 'PICKUP_WEAPON': {
          const weapon = state.groundWeapons[data.weaponId];
          const player = state.players[senderRole];
          if (weapon && !weapon.isPickedUp && player && !player.isDead) {
            weapon.isPickedUp = true;
            weapon.pickedUpBy = senderRole;
            player.equippedWeapon = data.weaponId;

            broadcast({
              type: 'WEAPON_PICKED_UP',
              weaponId: data.weaponId,
              playerId: senderRole,
            });
          }
          break;
        }

        case 'FIRE_SHOT': {
          const shooter = state.players[senderRole];
          if (!shooter || shooter.isDead || !shooter.equippedWeapon) return;

          // Broadcast bullet tracer
          broadcast({
            type: 'BULLET_TRACER',
            bullet: data.bullet,
          });

          // If client raycast indicated a hit, validate and apply authoritative damage
          if (data.targetPlayerId && state.matchState.status === 'playing') {
            const target = state.players[data.targetPlayerId];
            if (target && !target.isDead) {
              const newHp = Math.max(0, target.health - WEAPON_DAMAGE);
              target.health = newHp;
              const isFatal = newHp === 0;

              if (isFatal) {
                target.isDead = true;
                state.matchState = {
                  status: 'ended',
                  winner: senderRole,
                  eliminationMessage: `${target.name} ELIMINATED`,
                };
              }

              broadcast({
                type: 'DAMAGE_APPLIED',
                targetPlayerId: data.targetPlayerId,
                shooterId: senderRole,
                newHealth: target.health,
                damage: WEAPON_DAMAGE,
                isFatal,
                matchState: state.matchState,
              });
            }
          }
          break;
        }

        case 'RESTART_MATCH': {
          state = initialState();
          broadcast({
            type: 'MATCH_RESTARTED',
            state,
          });
          break;
        }
      }
    } catch (err) {
      console.error('[Server] Message error:', err);
    }
  });

  ws.on('close', () => {
    const role = sockets.get(ws);
    sockets.delete(ws);
    console.log(`[Server] Client disconnected (${role})`);
  });
});
