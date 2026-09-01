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

    // Vibrant festive color palette
    this.colors = [
      '#FFD700', // Gold
      '#FF1493', // Deep Pink
      '#00FFFF', // Cyan
      '#FF4500', // Orange Red
      '#7B68EE', // Medium Slate Blue
      '#00FF7F', // Spring Green
      '#FFFFFF', // Bright White
      '#FF007F', // Neon Magenta
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
   * Launch party poppers from left & right bottom corners plus top cascade
   */
  launchCelebration() {
    this.resizeCanvas();
    this.particles = [];
    this.isRunning = true;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // 1. Left Corner Party Popper Burst
    this.spawnPopperBurst(width * 0.1, height * 0.9, 85, 30, 60);

    // 2. Right Corner Party Popper Burst
    this.spawnPopperBurst(width * 0.9, height * 0.9, 120, 120, 150);

    // 3. Center High Cannon Burst
    this.spawnPopperBurst(width * 0.5, height * 0.85, 100, 60, 120);

    // 4. Cascading Rain Confetti across top
    for (let i = 0; i < 70; i++) {
      this.particles.push(this.createCascadingParticle(width, height));
    }

    if (!this.animationId) {
      this.loop();
    }
  }

  spawnPopperBurst(originX, originY, count, minAngleDeg, maxAngleDeg) {
    for (let i = 0; i < count; i++) {
      const angleRad = (Math.random() * (maxAngleDeg - minAngleDeg) + minAngleDeg) * (Math.PI / 180);
      const speed = Math.random() * 22 + 12;

      const isRibbon = Math.random() > 0.4;
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];

      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angleRad) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: -Math.abs(Math.sin(angleRad) * speed), // Shoot upwards
        gravity: 0.35 + Math.random() * 0.25,
        drag: 0.96,
        size: isRibbon ? Math.random() * 6 + 6 : Math.random() * 10 + 6,
        length: isRibbon ? Math.random() * 25 + 15 : Math.random() * 10 + 6,
        color: color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        oscillationSpeed: Math.random() * 0.1 + 0.05,
        oscillationOffset: Math.random() * Math.PI * 2,
        isRibbon: isRibbon,
        opacity: 1.0,
        decay: Math.random() * 0.003 + 0.002
      });
    }
  }

  createCascadingParticle(width, height) {
    const isRibbon = Math.random() > 0.5;
    return {
      x: Math.random() * width,
      y: -Math.random() * height * 0.5,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      gravity: 0.15 + Math.random() * 0.1,
      drag: 0.98,
      size: isRibbon ? Math.random() * 5 + 5 : Math.random() * 8 + 6,
      length: isRibbon ? Math.random() * 20 + 12 : Math.random() * 8 + 6,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      oscillationSpeed: Math.random() * 0.08 + 0.03,
      oscillationOffset: Math.random() * Math.PI * 2,
      isRibbon: isRibbon,
      opacity: 1.0,
      decay: Math.random() * 0.002 + 0.001
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

      p.x += p.vx + Math.sin(p.oscillationOffset) * 1.5;
      p.y += p.vy;

      p.oscillationOffset += p.oscillationSpeed;
      p.rotation += p.rotationSpeed;
      p.opacity -= p.decay;

      if (p.opacity <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      // Render particle
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;

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
