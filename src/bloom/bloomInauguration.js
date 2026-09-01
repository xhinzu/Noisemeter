/**
 * Bloom Inauguration Manager
 * Recreates the exact Bloomy AR Webcam Painting Interface:
 * - Live selfie mirrored video stream background
 * - Top glassmorphic brand pill ("🌸 Flower Wand 315")
 * - Bottom status pill ("✨ Point to plant · Open your hand to scatter")
 * - NO 3 bottom action buttons
 * - Pre-planted block of 315 blooming flowers on top of live camera feed
 * - Open palm hand gesture / pointer sweep unsticks flowers with explosion physics
 * - Reveals "RISE 2026" (Floral font) & "IS OFFICIALLY INAUGURATED! 🎉"
 */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const SPRITE_EMOJIS = [
  { emoji: '🌸', weight: 4 },
  { emoji: '🌺', weight: 4 },
  { emoji: '🌻', weight: 3 },
  { emoji: '🌼', weight: 3 },
  { emoji: '🌷', weight: 3 },
  { emoji: '🌹', weight: 3 },
  { emoji: '🪷', weight: 2 },
  { emoji: '🪻', weight: 2 },
  { emoji: '💐', weight: 2 },
  { emoji: '🏵️', weight: 2 },
  { emoji: '🌿', weight: 2 },
  { emoji: '🍀', weight: 2 },
  { emoji: '🦋', weight: 2 },
  { emoji: '🌱', weight: 1 }
];

export class BloomInauguration {
  constructor() {
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.video = null;
    this.stream = null;
    this.handLandmarker = null;
    this.animId = null;
    this.flowers = [];
    this.sprites = [];
    this.isHandTrackerReady = false;
    this.hasTriggeredScatter = false;
    this.scatteredCount = 0;
    this.totalFlowers = 315;
    this.onScatterComplete = null;

    this.counterBadge = null;
    this.statusPill = null;
  }

  /**
   * Pre-render high-DPI emoji sprites onto offscreen canvases
   */
  initSprites() {
    if (this.sprites.length > 0) return;

    for (let item of SPRITE_EMOJIS) {
      for (let w = 0; w < item.weight; w++) {
        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = 64;
        spriteCanvas.height = 64;
        const ctx = spriteCanvas.getContext('2d');

        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;

        ctx.font = '46px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, 32, 34);

        this.sprites.push(spriteCanvas);
      }
    }
  }

  /**
   * Start live selfie mirrored webcam feed
   */
  async startCamera(videoEl) {
    this.video = videoEl;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      this.video.srcObject = this.stream;
      await this.video.play();
    } catch (err) {
      console.warn("Bloom webcam fallback to mirror canvas:", err);
    }
  }

  /**
   * Initialize MediaPipe HandLandmarker for open-palm tracking
   */
  async initHandTracker() {
    if (this.handLandmarker) return;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2
      });
      this.isHandTrackerReady = true;
    } catch (err) {
      console.warn("HandLandmarker fallback to pointer/touch scatter:", err);
    }
  }

  /**
   * Populate pre-planted flower block over center text area (315 flowers)
   */
  createFlowerBlock(width, height) {
    this.flowers = [];
    this.hasTriggeredScatter = false;
    this.scatteredCount = 0;
    this.totalFlowers = 315;

    const blockWidth = Math.min(width * 0.85, 680);
    const blockHeight = Math.min(height * 0.6, 300);
    const startX = (width - blockWidth) / 2;
    const startY = (height - blockHeight) / 2;

    const rows = 15;
    const cols = 21; // 15 x 21 = 315 flowers!
    const stepX = blockWidth / cols;
    const stepY = blockHeight / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jitterX = (Math.random() - 0.5) * stepX * 0.8;
        const jitterY = (Math.random() - 0.5) * stepY * 0.8;
        const fx = startX + c * stepX + stepX / 2 + jitterX;
        const fy = startY + r * stepY + stepY / 2 + jitterY;

        const spriteIndex = Math.floor(Math.random() * this.sprites.length);
        const baseSize = 38 + Math.random() * 16;

        this.flowers.push({
          x: fx,
          y: fy,
          origX: fx,
          origY: fy,
          sprite: this.sprites[spriteIndex],
          baseSize: baseSize,
          scale: 0.1,
          targetScale: 1.0,
          rotation: Math.random() * Math.PI * 2,
          vRot: 0,
          vx: 0,
          vy: 0,
          state: 'planted',
          opacity: 1.0
        });
      }
    }

    if (this.counterBadge) {
      this.counterBadge.textContent = this.totalFlowers.toString();
    }
  }

  /**
   * Launch the Bloomy AR Viewport Experience inside modal
   */
  async start(canvasEl, videoEl, onCompleteCallback) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.onScatterComplete = onCompleteCallback;

    this.counterBadge = document.getElementById('bloom-flower-count');
    this.statusPill = document.getElementById('bloom-status-pill');

    // Auto-resize canvas to match container bounds
    const container = canvasEl.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth || 800;
      this.canvas.height = container.clientHeight || 500;
    }

    this.initSprites();
    this.createFlowerBlock(this.canvas.width, this.canvas.height);

    // Setup pointer fallback
    this.bindPointerEvents();

    // Start selfie camera stream & hand tracker
    await this.startCamera(videoEl);
    this.initHandTracker();

    // Start 60fps render loop
    this.loop();
  }

  bindPointerEvents() {
    if (!this.canvas) return;

    const handlePointer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      this.scatterFromPoint(px, py, 180);
    };

    this.canvas.onmousemove = (e) => {
      if (e.buttons > 0 || Math.random() < 0.4) {
        handlePointer(e);
      }
    };
    this.canvas.onclick = handlePointer;
    this.canvas.ontouchmove = (e) => {
      if (e.touches[0]) handlePointer(e.touches[0]);
    };
  }

  /**
   * Unstick flowers within radius of point and send scattering
   */
  scatterFromPoint(px, py, radius = 180) {
    const radiusSq = radius * radius;

    for (let flower of this.flowers) {
      if (flower.state !== 'planted') continue;

      const dx = flower.x - px;
      const dy = flower.y - py;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        flower.state = 'scattered';
        this.scatteredCount++;

        const dist = Math.sqrt(distSq) || 1;
        const speed = 8 + Math.random() * 14;
        flower.vx = (dx / dist) * speed + (Math.random() - 0.5) * 4;
        flower.vy = (dy / dist) * speed - (2 + Math.random() * 6);
        flower.vRot = (Math.random() - 0.5) * 0.25;
      }
    }

    const remaining = Math.max(0, this.totalFlowers - this.scatteredCount);
    if (this.counterBadge) {
      this.counterBadge.textContent = remaining.toString();
    }

    if (this.scatteredCount > 10 && this.statusPill) {
      this.statusPill.innerHTML = `<span>🌸</span><span>Scattering flowers!</span>`;
      this.statusPill.classList.add('scattering');
    }

    // Trigger complete callback when >35% flowers scattered
    if (!this.hasTriggeredScatter && this.scatteredCount > this.totalFlowers * 0.35) {
      this.hasTriggeredScatter = true;
      if (this.onScatterComplete) this.onScatterComplete();
    }
  }

  /**
   * Process video frame with MediaPipe to detect open palm
   */
  detectHandGesture() {
    if (!this.isHandTrackerReady || !this.video || this.video.readyState < 2) return;

    try {
      const results = this.handLandmarker.detectForVideo(this.video, performance.now());
      if (results.landmarks && results.landmarks.length > 0) {
        for (let landmarks of results.landmarks) {
          const wrist = landmarks[0];
          const indexTip = landmarks[8];
          const middleTip = landmarks[12];

          // Mirror X for selfie video matching
          const palmX = (1 - (wrist.x + indexTip.x + middleTip.x) / 3) * this.canvas.width;
          const palmY = ((wrist.y + indexTip.y + middleTip.y) / 3) * this.canvas.height;

          this.scatterFromPoint(palmX, palmY, 220);
        }
      }
    } catch (err) {
      // Ignore frame skip errors
    }
  }

  /**
   * Main 60fps render loop
   */
  loop() {
    if (!this.canvas || !this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    // Run gesture detection
    this.detectHandGesture();

    // Update & Render Flowers
    for (let flower of this.flowers) {
      if (flower.scale < flower.targetScale) {
        flower.scale += (flower.targetScale - flower.scale) * 0.2;
      }

      if (flower.state === 'scattered') {
        flower.x += flower.vx;
        flower.y += flower.vy;
        flower.vy += 0.35; // Gravity
        flower.vx *= 0.98; // Drag
        flower.rotation += flower.vRot;
        flower.opacity -= 0.008;
      }

      if (flower.opacity <= 0) continue;

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, flower.opacity);
      this.ctx.translate(flower.x, flower.y);
      this.ctx.rotate(flower.rotation);

      const drawSize = flower.baseSize * flower.scale;
      this.ctx.drawImage(
        flower.sprite,
        -drawSize / 2,
        -drawSize / 2,
        drawSize,
        drawSize
      );
      this.ctx.restore();
    }

    this.animId = requestAnimationFrame(() => this.loop());
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
