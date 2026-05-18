"use client";

import { useEffect, useRef } from "react";

// Star background particle
class Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = 0.5 + Math.random() * 1.5;
    this.opacity = 0.3 + Math.random() * 0.7;
    this.twinkleSpeed = 0.002 + Math.random() * 0.003;
    this.twinkleOffset = Math.random() * Math.PI * 2;
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    const twinkle = Math.sin(time * this.twinkleSpeed + this.twinkleOffset);
    const alpha = this.opacity * (0.6 + twinkle * 0.4);

    // Star glow
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.size * 2,
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(200, 220, 255, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(150, 180, 255, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Star core
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Meteor particle
class Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  speed: number;
  hue: number;
  canvasWidth: number;
  canvasHeight: number;
  trail: { x: number; y: number; alpha: number; size: number }[];
  brightness: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.trail = [];

    // Avoid center region (30-70% of canvas)
    // Spawn meteors only from edges
    const centerMinX = canvasWidth * 0.3;
    const centerMaxX = canvasWidth * 0.7;
    const centerMinY = canvasHeight * 0.3;
    const centerMaxY = canvasHeight * 0.7;

    // Randomly choose spawn from top or left edge
    const spawnFromTop = Math.random() < 0.5;

    if (spawnFromTop) {
      // Spawn from top edge, avoiding center horizontal band
      this.y = -50 - Math.random() * 50;

      // Choose left or right edge areas
      if (Math.random() < 0.5) {
        // Left edge area (0% to 30% of width)
        this.x = Math.random() * centerMinX;
      } else {
        // Right edge area (70% to 100% of width)
        this.x = centerMaxX + Math.random() * (canvasWidth - centerMaxX);
      }
    } else {
      // Spawn from left edge, avoiding center vertical band
      this.x = -50 - Math.random() * 50;

      // Choose top or bottom edge areas
      if (Math.random() < 0.5) {
        // Top edge area (0% to 30% of height)
        this.y = Math.random() * centerMinY;
      } else {
        // Bottom edge area (70% to 100% of height)
        this.y = centerMaxY + Math.random() * (canvasHeight - centerMaxY);
      }
    }

    // Diagonal movement (top-left to bottom-right)
    this.speed = 8 + Math.random() * 12;
    const angle = (Math.PI / 4) * (0.8 + Math.random() * 0.4); // ~45 degrees with variation
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    this.size = 1.5 + Math.random() * 2.5;
    this.life = 0;
    this.maxLife = 100 + Math.random() * 80;

    // Color variation: mostly white/blue, some orange/yellow
    const colorType = Math.random();
    if (colorType < 0.7) {
      // White/blue meteors (most common)
      this.hue = 200 + Math.random() * 40; // Blue range
      this.brightness = 0.9 + Math.random() * 0.1;
    } else if (colorType < 0.9) {
      // Yellow/orange meteors
      this.hue = 30 + Math.random() * 30; // Orange-yellow range
      this.brightness = 0.8 + Math.random() * 0.2;
    } else {
      // Rare cyan/teal meteors
      this.hue = 170 + Math.random() * 20;
      this.brightness = 0.85 + Math.random() * 0.15;
    }
  }

  update() {
    // Store trail positions with longer history
    if (this.trail.length < 25) {
      this.trail.push({
        x: this.x,
        y: this.y,
        alpha: 1,
        size: this.size,
      });
    }

    // Update trail alphas for fade effect
    this.trail.forEach((point, i) => {
      point.alpha = (this.trail.length - i) / this.trail.length;
    });

    if (this.trail.length > 25) this.trail.shift();

    // Move meteor
    this.x += this.vx;
    this.y += this.vy;
    this.life++;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const lifeRatio = this.life / this.maxLife;
    const alpha = 1 - lifeRatio;

    // Draw extended tail trail
    if (this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const point = this.trail[i];
        const nextPoint = this.trail[i + 1];
        const trailAlpha = alpha * point.alpha * 0.6;

        // Gradient tail
        const gradient = ctx.createLinearGradient(
          point.x,
          point.y,
          nextPoint.x,
          nextPoint.y,
        );

        if (this.hue >= 180 && this.hue <= 240) {
          // Blue/white meteors
          gradient.addColorStop(
            0,
            `rgba(255, 255, 255, ${trailAlpha * this.brightness})`,
          );
          gradient.addColorStop(
            0.5,
            `rgba(200, 230, 255, ${trailAlpha * 0.7})`,
          );
          gradient.addColorStop(
            0.8,
            `hsla(${this.hue}, 80%, 70%, ${trailAlpha * 0.4})`,
          );
          gradient.addColorStop(1, `hsla(${this.hue}, 70%, 60%, 0)`);
        } else if (this.hue >= 20 && this.hue <= 60) {
          // Orange/yellow meteors
          gradient.addColorStop(
            0,
            `rgba(255, 240, 200, ${trailAlpha * this.brightness})`,
          );
          gradient.addColorStop(
            0.5,
            `hsla(${this.hue}, 100%, 70%, ${trailAlpha * 0.8})`,
          );
          gradient.addColorStop(1, `hsla(${this.hue}, 90%, 60%, 0)`);
        } else {
          // Cyan/teal meteors
          gradient.addColorStop(
            0,
            `rgba(200, 255, 255, ${trailAlpha * this.brightness})`,
          );
          gradient.addColorStop(
            0.5,
            `hsla(${this.hue}, 90%, 75%, ${trailAlpha * 0.7})`,
          );
          gradient.addColorStop(1, `hsla(${this.hue}, 80%, 65%, 0)`);
        }

        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.size * (1 + point.alpha * 0.5);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();
      }
    }

    // Draw outer glow
    const glowSize = this.size * 8;
    const glowGradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      glowSize,
    );

    if (this.hue >= 180 && this.hue <= 240) {
      glowGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
      glowGradient.addColorStop(0.3, `rgba(200, 230, 255, ${alpha * 0.5})`);
      glowGradient.addColorStop(
        0.6,
        `hsla(${this.hue}, 80%, 70%, ${alpha * 0.2})`,
      );
      glowGradient.addColorStop(1, `hsla(${this.hue}, 70%, 60%, 0)`);
    } else if (this.hue >= 20 && this.hue <= 60) {
      glowGradient.addColorStop(0, `rgba(255, 245, 220, ${alpha * 0.95})`);
      glowGradient.addColorStop(
        0.3,
        `hsla(${this.hue}, 100%, 75%, ${alpha * 0.6})`,
      );
      glowGradient.addColorStop(
        0.6,
        `hsla(${this.hue}, 95%, 65%, ${alpha * 0.3})`,
      );
      glowGradient.addColorStop(1, `hsla(${this.hue}, 90%, 60%, 0)`);
    } else {
      glowGradient.addColorStop(0, `rgba(220, 255, 255, ${alpha * 0.9})`);
      glowGradient.addColorStop(
        0.3,
        `hsla(${this.hue}, 90%, 80%, ${alpha * 0.5})`,
      );
      glowGradient.addColorStop(
        0.6,
        `hsla(${this.hue}, 85%, 70%, ${alpha * 0.25})`,
      );
      glowGradient.addColorStop(1, `hsla(${this.hue}, 80%, 65%, 0)`);
    }

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw bright meteor head
    const headSize = this.size * 2.5;
    const headGradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      headSize,
    );

    headGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    if (this.hue >= 180 && this.hue <= 240) {
      headGradient.addColorStop(0.4, `rgba(220, 240, 255, ${alpha * 0.9})`);
      headGradient.addColorStop(
        1,
        `hsla(${this.hue}, 85%, 75%, ${alpha * 0.5})`,
      );
    } else if (this.hue >= 20 && this.hue <= 60) {
      headGradient.addColorStop(
        0.4,
        `hsla(${this.hue}, 100%, 80%, ${alpha * 0.95})`,
      );
      headGradient.addColorStop(
        1,
        `hsla(${this.hue}, 95%, 70%, ${alpha * 0.6})`,
      );
    } else {
      headGradient.addColorStop(0.4, `rgba(210, 255, 255, ${alpha * 0.9})`);
      headGradient.addColorStop(
        1,
        `hsla(${this.hue}, 90%, 80%, ${alpha * 0.6})`,
      );
    }

    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, headSize, 0, Math.PI * 2);
    ctx.fill();

    // Ultra-bright core
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * this.brightness})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  isDead() {
    if (this.life >= this.maxLife) return true;

    // Remove if off-screen
    if (this.x > this.canvasWidth + 100 || this.y > this.canvasHeight + 100) {
      return true;
    }

    return false;
  }
}

export function ParticleFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Set canvas size with device pixel ratio for sharpness
    const updateSize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas);

    // Create static star field
    const stars: Star[] = [];
    const starCount = 150;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    for (let i = 0; i < starCount; i++) {
      stars.push(new Star(width, height));
    }

    const meteors: Meteor[] = [];
    const maxMeteors = 4;

    function animate() {
      if (!ctx || !canvas) return;

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      time++;

      // Dark space background
      ctx.fillStyle = "rgba(5, 8, 20, 1)";
      ctx.fillRect(0, 0, width, height);

      // Draw twinkling stars
      stars.forEach((star) => star.draw(ctx, time));

      // Spawn meteors with controlled randomness
      if (meteors.length < maxMeteors) {
        if (Math.random() < 0.04) {
          // 8% chance per frame
          meteors.push(new Meteor(width, height));
        }
      }

      // Update and draw meteors
      for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.update();
        meteor.draw(ctx);

        if (meteor.isDead()) {
          meteors.splice(i, 1);
        }
      }

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        opacity: 0.95,
      }}
    />
  );
}
