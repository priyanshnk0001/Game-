// Centralized Input Manager
// Captures and processes all keyboard and mouse states for the tactical shooter.
// Prevents unwanted browser scrolling, context menus, and stuck keys on blur.

export interface InputState {
  forward: boolean;     // W
  backward: boolean;    // S
  left: boolean;        // A
  right: boolean;       // D
  sprint: boolean;      // Shift (hold)
  crouch: boolean;      // C or Ctrl
  prone: boolean;       // Z
  jump: boolean;        // Space
  reload: boolean;      // R
  interact: boolean;    // E
  slot1: boolean;       // 1
  slot2: boolean;       // 2
  scoreboard: boolean;  // Tab (hold)
  fire: boolean;        // LMB (hold)
  aim: boolean;         // RMB (hold)
  toggleHolster: boolean; // Q (toggle)
}

class InputManager {
  public state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    crouch: false,
    prone: false,
    jump: false,
    reload: false,
    interact: false,
    slot1: false,
    slot2: false,
    scoreboard: false,
    fire: false,
    aim: false,
    toggleHolster: false,
  };

  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private canvas: HTMLElement | null = null;
  public isLocked = false;
  private listenersAttached = false;

  private onLockChangeCallbacks: Set<(locked: boolean) => void> = new Set();

  init(canvasElement: HTMLElement) {
    this.canvas = canvasElement;
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    // Pointer Lock change listener (explicitly triggered via resume controls or modal deploy)
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.canvas;
      this.onLockChangeCallbacks.forEach((cb) => cb(this.isLocked));
      if (!this.isLocked) {
        this.resetInputs();
      }
    });

    // Mouse movement
    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    // Mouse Buttons
    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.isLocked) return;
      if (e.button === 0) {
        this.state.fire = true;
      } else if (e.button === 2) {
        this.state.aim = true;
      }
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button === 0) {
        this.state.fire = false;
      } else if (e.button === 2) {
        this.state.aim = false;
      }
    });

    // Prevent context menu on right click for aiming
    window.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });

    // Keyboard down
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Prevent browser scrolling and default behaviors
      if (
        e.code === 'Space' ||
        e.code === 'Tab' ||
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight'
      ) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.state.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.state.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.state.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.state.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.state.sprint = true;
          break;
        case 'KeyC':
        case 'ControlLeft':
        case 'ControlRight':
          this.state.crouch = true;
          break;
        case 'KeyZ':
          this.state.prone = true;
          break;
        case 'Space':
          this.state.jump = true;
          break;
        case 'KeyR':
          this.state.reload = true;
          break;
        case 'KeyQ':
          this.state.toggleHolster = true;
          break;
        case 'KeyE':
          this.state.interact = true;
          break;
        case 'Digit1':
          this.state.slot1 = true;
          break;
        case 'Digit2':
          this.state.slot2 = true;
          break;
        case 'Tab':
          this.state.scoreboard = true;
          break;
        case 'Escape':
          // Release pointer lock naturally
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          break;
      }
    });

    // Keyboard up
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.state.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.state.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.state.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.state.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.state.sprint = false;
          break;
        case 'KeyC':
        case 'ControlLeft':
        case 'ControlRight':
          this.state.crouch = false;
          break;
        case 'KeyZ':
          this.state.prone = false;
          break;
        case 'Space':
          this.state.jump = false;
          break;
        case 'KeyR':
          this.state.reload = false;
          break;
        case 'KeyQ':
          this.state.toggleHolster = false;
          break;
        case 'KeyE':
          this.state.interact = false;
          break;
        case 'Digit1':
          this.state.slot1 = false;
          break;
        case 'Digit2':
          this.state.slot2 = false;
          break;
        case 'Tab':
          this.state.scoreboard = false;
          break;
      }
    });

    // Reset inputs on blur / tab switch to prevent stuck keys
    window.addEventListener('blur', () => {
      this.resetInputs();
    });
  }

  // Consume and reset mouse delta per frame
  consumeMouseDelta(): { deltaX: number; deltaY: number } {
    if (!this.isLocked) {
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
      return { deltaX: 0, deltaY: 0 };
    }
    const dx = this.mouseDeltaX;
    const dy = this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { deltaX: dx, deltaY: dy };
  }

  onLockChange(callback: (locked: boolean) => void): () => void {
    this.onLockChangeCallbacks.add(callback);
    return () => this.onLockChangeCallbacks.delete(callback);
  }

  requestLock() {
    this.canvas?.requestPointerLock();
  }

  unlock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  resetInputs() {
    this.state.forward = false;
    this.state.backward = false;
    this.state.left = false;
    this.state.right = false;
    this.state.sprint = false;
    this.state.crouch = false;
    this.state.jump = false;
    this.state.reload = false;
    this.state.interact = false;
    this.state.slot1 = false;
    this.state.slot2 = false;
    this.state.scoreboard = false;
    this.state.fire = false;
    this.state.aim = false;
    this.state.toggleHolster = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }
}

export const inputManager = new InputManager();
