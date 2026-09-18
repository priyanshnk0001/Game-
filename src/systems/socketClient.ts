import { gameState } from './gameState';
import { PlayerId, WeaponId, BulletTracer } from '../types/game';

class SocketClient {
  private ws: WebSocket | null = null;
  public isConnected = false;
  public assignedRole: PlayerId | 'spectator' | null = null;

  connect(url = 'ws://localhost:3001') {
    if (this.ws) return;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[SocketClient] Connected to server');
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (err) {
          console.error('[SocketClient] Parse error:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[SocketClient] Disconnected');
        this.isConnected = false;
        this.ws = null;
      };

      this.ws.onerror = () => {
        // Silently fall back to local mode if server is not running
        this.isConnected = false;
      };
    } catch {
      // Local fallback
    }
  }

  private handleMessage(data: Record<string, unknown>) {
    switch (data.type) {
      case 'INIT': {
        const role = data.role as PlayerId | 'spectator';
        this.assignedRole = role;
        if (role === 'player1' || role === 'player2') {
          gameState.setActivePlayer(role);
        }
        break;
      }
      case 'PLAYER_TRANSFORM': {
        const pid = data.playerId as PlayerId;
        const pos = data.position as [number, number, number];
        const rotY = data.rotationY as number;
        const pitch = data.pitch as number;
        gameState.updatePlayerTransform(pid, pos, rotY, pitch);
        if (typeof data.isAiming === 'boolean') {
          gameState.setAiming(pid, data.isAiming);
        }
        break;
      }
      case 'WEAPON_PICKED_UP': {
        const pid = data.playerId as PlayerId;
        const wid = data.weaponId as WeaponId;
        gameState.pickupWeapon(pid, wid);
        break;
      }
      case 'BULLET_TRACER': {
        const b = data.bullet as BulletTracer;
        gameState.addBullet(b);
        break;
      }
      case 'DAMAGE_APPLIED': {
        const targetId = data.targetPlayerId as PlayerId;
        const shooterId = data.shooterId as PlayerId;
        const damage = data.damage as number;
        gameState.applyDamage(targetId, shooterId, damage);
        break;
      }
      case 'MATCH_RESTARTED': {
        gameState.restartMatch();
        break;
      }
    }
  }

  sendTransform(pos: [number, number, number], rotY: number, pitch: number, isAiming: boolean) {
    if (this.ws && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: 'TRANSFORM',
          position: pos,
          rotationY: rotY,
          pitch,
          isAiming,
        })
      );
    }
  }

  sendPickup(weaponId: WeaponId) {
    if (this.ws && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: 'PICKUP_WEAPON',
          weaponId,
        })
      );
    }
  }

  sendShot(bullet: BulletTracer, targetPlayerId: PlayerId | null) {
    if (this.ws && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: 'FIRE_SHOT',
          bullet,
          targetPlayerId,
        })
      );
    }
  }

  sendRestart() {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'RESTART_MATCH' }));
    }
  }
}

export const socketClient = new SocketClient();
