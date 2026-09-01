/**
 * RISE 2026 Inauguration - Interactive HTML5 Canvas Confetti & Party Popper Particle Engine
 */

export class ConfettiEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particles = [];
    this.animationId = null;
    this.isRunning = false;

    // High contrast neon & metallic festive color palette
    this.colors = [
      '#FFD700', // Metallic Gold
      '#FF1493', // Neon Pink
      '#00FFFF', // Electric Cyan
      '#FF4500', // Bright Crimson
      '#A855F7', // Vivid Purple
      '#00FF7F', // Neon Green
      '#FFFFFF', // Pure White
      '#FFD700', // Double Gold weight
      '#38EF7D'  // Emerald
    ];

    this.resizeCanvas = this.resizeCanvas.bind(this);
    window.addEventListener('resize', this.resizeCanvas);
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Launch party poppers from left & right bottom corners plus center high blast
   */
  launchCelebration() {
    this.resizeCanvas();
    this.particles = [];
    this.isRunning = true;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // 1. Left Corner Party Popper Cannon (Angles ~45 to ~75 degrees)
    this.spawnPopperBurst(width * 0.08, height * 0.95, 140, 40, 80, 1);

    // 2. Right Corner Party Popper Cannon (Angles ~105 to ~140 degrees)
    this.spawnPopperBurst(width * 0.92, height * 0.95, 140, 100, 140, -1);

    // 3. Center High Cannon Burst
    this.spawnPopperBurst(width * 0.5, height * 0.85, 160, 60, 120, 0);

    // 4. Cascading Rain Confetti across full top
    for (let i = 0; i < 100; i++) {
      this.particles.push(this.createCascadingParticle(width, height));
    }

    if (!this.animationId) {
      this.loop();
    }
  }

  spawnPopperBurst(originX, originY, count, minAngleDeg, maxAngleDeg, directionSign) {
    for (let i = 0; i < count; i++) {
      const angleRad = (Math.random() * (maxAngleDeg - minAngleDeg) + minAngleDeg) * (Math.PI / 180);
      const speed = Math.random() * 32 + 18;

      const isRibbon = Math.random() > 0.35;
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];

      let vx = Math.cos(angleRad) * speed;
      if (directionSign < 0) vx = -Math.abs(vx);
      else if (directionSign > 0) vx = Math.abs(vx);
      else vx = (Math.random() - 0.5) * speed * 1.5;

      this.particles.push({
        x: originX,
        y: originY,
        vx: vx,
        vy: -Math.abs(Math.sin(angleRad) * speed * 1.2), // Explosive upward vector
        gravity: 0.38 + Math.random() * 0.2,
        drag: 0.965,
        size: isRibbon ? Math.random() * 8 + 8 : Math.random() * 14 + 8,
        length: isRibbon ? Math.random() * 35 + 20 : Math.random() * 14 + 8,
        color: color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        oscillationSpeed: Math.random() * 0.12 + 0.05,
        oscillationOffset: Math.random() * Math.PI * 2,
        isRibbon: isRibbon,
        opacity: 1.0,
        decay: Math.random() * 0.0025 + 0.0015
      });
    }
  }

  createCascadingParticle(width, height) {
    const isRibbon = Math.random() > 0.5;
    return {
      x: Math.random() * width,
      y: -Math.random() * height * 0.5,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 5 + 3,
      gravity: 0.18 + Math.random() * 0.1,
      drag: 0.985,
      size: isRibbon ? Math.random() * 7 + 6 : Math.random() * 12 + 8,
      length: isRibbon ? Math.random() * 30 + 15 : Math.random() * 12 + 8,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      oscillationSpeed: Math.random() * 0.09 + 0.04,
      oscillationOffset: Math.random() * Math.PI * 2,
      isRibbon: isRibbon,
      opacity: 1.0,
      decay: Math.random() * 0.0018 + 0.001
    };
  }

  loop = () => {
    if (!this.isRunning || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Physics integration
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;

      p.x += p.vx + Math.sin(p.oscillationOffset) * 2.0;
      p.y += p.vy;

      p.oscillationOffset += p.oscillationSpeed;
      p.rotation += p.rotationSpeed;
      p.opacity -= p.decay;

      if (p.opacity <= 0 || p.y > this.canvas.height + 60) {
        this.particles.splice(i, 1);
        continue;
      }

      // Render particle with glowing effect
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 10;

      if (p.isRibbon) {
        // Draw ribbon streamer
        this.ctx.fillRect(-p.size / 2, -p.length / 2, p.size, p.length);
      } else {
        // Draw confetti square/circle
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.loop);
    } else {
      this.stop();
    }
  };

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
