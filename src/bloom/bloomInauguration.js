/**
 * Bloom Inauguration Manager - High Performance AR Flower Scattering Engine
 * Optimized for 60fps performance with throttled MediaPipe landmarker,
 * low-latency desynchronized canvas 2D rendering, and swap-delete particle physics.
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
    this.totalFlowers = 154;
    this.onScatterComplete = null;

    // Performance throttling
    this.frameCounter = 0;
    this.lastPalmPositions = [];
    this.detectionThrottleFrames = 2; // Run landmarker every 2nd frame (30fps detection, 60fps render)
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

        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

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
   * Populate pre-planted flower block over center text area (154 flowers)
   */
  createFlowerBlock(width, height) {
    this.flowers = [];
    this.hasTriggeredScatter = false;
    this.scatteredCount = 0;

    const blockWidth = Math.min(width * 0.82, 640);
    const blockHeight = Math.min(height * 0.58, 280);
    const startX = (width - blockWidth) / 2;
    const startY = (height - blockHeight) / 2;

    const rows = 11;
    const cols = 14; // 11 x 14 = 154 flowers
    const stepX = blockWidth / cols;
    const stepY = blockHeight / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jitterX = (Math.random() - 0.5) * stepX * 0.75;
        const jitterY = (Math.random() - 0.5) * stepY * 0.75;
        const fx = startX + c * stepX + stepX / 2 + jitterX;
        const fy = startY + r * stepY + stepY / 2 + jitterY;

        const spriteIndex = Math.floor(Math.random() * this.sprites.length);
        const baseSize = 44 + Math.random() * 16;

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

    this.totalFlowers = this.flowers.length;
  }

  /**
   * Launch the Bloomy AR Viewport Experience inside modal
   */
  async start(canvasEl, videoEl, onCompleteCallback) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d', { alpha: true, desynchronized: true });
    this.onScatterComplete = onCompleteCallback;
    this.frameCounter = 0;
    this.lastPalmPositions = [];

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

    for (let i = 0; i < this.flowers.length; i++) {
      const flower = this.flowers[i];
      if (flower.state !== 'planted') continue;

      const dx = flower.x - px;
      const dy = flower.y - py;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        flower.state = 'scattered';
        this.scatteredCount++;

        const dist = Math.sqrt(distSq) || 1;
        const speed = 9 + Math.random() * 12;
        flower.vx = (dx / dist) * speed + (Math.random() - 0.5) * 4;
        flower.vy = (dy / dist) * speed - (2 + Math.random() * 6);
        flower.vRot = (Math.random() - 0.5) * 0.25;
      }
    }

    // Trigger complete callback when >30% flowers scattered (No second confetti pop!)
    if (!this.hasTriggeredScatter && this.scatteredCount > this.totalFlowers * 0.3) {
      this.hasTriggeredScatter = true;
      if (this.onScatterComplete) this.onScatterComplete();
    }
  }

  /**
   * Process video frame with MediaPipe (Throttled to 30Hz for 60fps smooth canvas rendering)
   */
  detectHandGesture() {
    if (!this.isHandTrackerReady || !this.video || this.video.readyState < 2) return;

    this.frameCounter++;
    
    // Only run MediaPipe inference every Nth frame to preserve CPU/GPU
    if (this.frameCounter % this.detectionThrottleFrames === 0) {
      try {
        const results = this.handLandmarker.detectForVideo(this.video, performance.now());
        this.lastPalmPositions = [];
        if (results.landmarks && results.landmarks.length > 0) {
          for (let landmarks of results.landmarks) {
            const wrist = landmarks[0];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];

            // Mirror X for selfie video matching
            const palmX = (1 - (wrist.x + indexTip.x + middleTip.x) / 3) * this.canvas.width;
            const palmY = ((wrist.y + indexTip.y + middleTip.y) / 3) * this.canvas.height;
            this.lastPalmPositions.push({ x: palmX, y: palmY });
          }
        }
      } catch (err) {
        // Skip frame on error
      }
    }

    // Apply scatter from active palm positions
    for (let pos of this.lastPalmPositions) {
      this.scatterFromPoint(pos.x, pos.y, 220);
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

    // Run throttled hand gesture detection
    this.detectHandGesture();

    // Update & Render Flowers
    for (let i = 0; i < this.flowers.length; i++) {
      const flower = this.flowers[i];

      if (flower.scale < flower.targetScale) {
        flower.scale += (flower.targetScale - flower.scale) * 0.25;
      }

      if (flower.state === 'scattered') {
        flower.x += flower.vx;
        flower.y += flower.vy;
        flower.vy += 0.35; // Gravity
        flower.vx *= 0.98; // Drag
        flower.rotation += flower.vRot;
        flower.opacity -= 0.01;
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
