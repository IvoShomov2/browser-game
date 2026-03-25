class Plant {
  constructor(col, row, config) {
    this.col = col;
    this.row = row;
    this.type = config.type;
    this.name = config.name;
    this.cost = config.cost;
    this.maxHealth = config.maxHealth;
    this.health = config.maxHealth;
    this.reloadTime = config.reloadTime || 0;
    this.reload = Math.random() * this.reloadTime;
    this.sunInterval = config.sunInterval || 0;
    this.sunTimer = this.sunInterval;
    this.damage = config.damage || 0;
    this.color = config.color;
    this.highlight = config.highlight;
    this.size = config.size || 0.72;
    this.shake = 0;
    this.variant = Math.random() * Math.PI * 2;
    this.bobSpeed = 3 + Math.random() * 2;
    this.recoil = 0;
    this.expression = Math.random() * Math.PI * 2;
  }

  update(game, deltaTime) {
    this.shake = Math.max(0, this.shake - deltaTime * 4);
    this.recoil = Math.max(0, this.recoil - deltaTime * 4.8);

    if (this.type === "peashooter") {
      this.reload -= deltaTime;
      if (this.reload <= 0 && game.hasZombieAhead(this.row, this.col)) {
        const position = this.getCenter(game);
        game.projectiles.push(
          new Projectile(
            position.x + game.cellWidth * 0.18,
            position.y - game.cellHeight * 0.05,
            this.row,
            this.damage
          )
        );
        this.reload = this.reloadTime;
        this.recoil = 1;
        game.playSound("shoot");
      }
    }

    if (this.type === "sunflower") {
      this.sunTimer -= deltaTime;
      if (this.sunTimer <= 0) {
        const position = this.getCenter(game);
        game.spawnSun(position.x, position.y - 28, 25, false);
        this.sunTimer = this.sunInterval;
        game.playSound("sun-create");
      }
    }
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.shake = 1;
  }

  isDead() {
    return this.health <= 0;
  }

  getCenter(game) {
    const cell = game.getCellRect(this.col, this.row);
    return {
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2
    };
  }

  getBounds(game) {
    const center = this.getCenter(game);
    const width = game.cellWidth * this.size;
    const height = game.cellHeight * this.size;

    return {
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height
    };
  }

  drawShadow(ctx, game) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, game.cellHeight * 0.23, game.cellWidth * 0.19, game.cellHeight * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  draw(ctx, game) {
    const cell = game.getCellRect(this.col, this.row);
    const center = this.getCenter(game);
    const bounce = Math.sin(game.totalTime * this.bobSpeed + this.variant) * 3;
    const tilt = Math.sin(game.totalTime * 1.6 + this.variant) * 0.04;
    const scale = 1 - this.shake * 0.06;

    ctx.save();
    ctx.translate(center.x, center.y + bounce);
    this.drawShadow(ctx, game);
    ctx.scale(scale, scale);
    ctx.rotate(tilt);

    if (this.type === "peashooter") {
      this.drawPeashooter(ctx, game);
    }

    if (this.type === "sunflower") {
      this.drawSunflower(ctx);
    }

    if (this.type === "wallnut") {
      this.drawWallnut(ctx, game);
    }

    ctx.restore();

    const healthRatio = this.health / this.maxHealth;
    ctx.fillStyle = "rgba(22, 20, 15, 0.42)";
    ctx.fillRect(cell.x + 14, cell.y + cell.height - 14, cell.width - 28, 7);
    ctx.fillStyle = healthRatio > 0.45 ? "#87d556" : "#ffb347";
    ctx.fillRect(cell.x + 14, cell.y + cell.height - 14, (cell.width - 28) * healthRatio, 7);
  }

  drawStem(ctx) {
    const stemGradient = ctx.createLinearGradient(0, 34, 0, -18);
    stemGradient.addColorStop(0, "#2f6a18");
    stemGradient.addColorStop(1, "#84ce56");
    ctx.strokeStyle = stemGradient;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 32);
    ctx.quadraticCurveTo(-4, 8, 0, -18);
    ctx.stroke();

    ctx.fillStyle = "#4e982d";
    ctx.beginPath();
    ctx.ellipse(-16, 10, 16, 8, -0.45, 0, Math.PI * 2);
    ctx.ellipse(16, 8, 16, 8, 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-27, 9);
    ctx.lineTo(-10, 10);
    ctx.moveTo(10, 9);
    ctx.lineTo(27, 8);
    ctx.stroke();
  }

  drawPeashooter(ctx, game) {
    this.drawStem(ctx);
    const recoilOffset = this.recoil * 8;
    const jawPulse = Math.max(0, this.recoil) * 6;

    ctx.save();
    ctx.translate(-recoilOffset, 0);

    const head = ctx.createRadialGradient(-8, -18, 8, 4, -16, 34);
    head.addColorStop(0, "#b6f888");
    head.addColorStop(1, "#4b9e2a");
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(0, -18, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5aa933";
    ctx.beginPath();
    ctx.arc(18, -16, 10, 0, Math.PI * 2);
    ctx.fill();

    const muzzle = ctx.createLinearGradient(12, -23, 42, -13);
    muzzle.addColorStop(0, "#a2eb74");
    muzzle.addColorStop(1, "#4c9d2a");
    ctx.fillStyle = muzzle;
    ctx.beginPath();
    ctx.roundRect(10, -29, 33, 22, 11);
    ctx.fill();

    ctx.fillStyle = "#2c5d1a";
    ctx.beginPath();
    ctx.arc(41, -18, 7 + jawPulse * 0.08, 0, Math.PI * 2);
    ctx.fill();

    if (this.recoil > 0.08) {
      ctx.fillStyle = `rgba(212,255,173, ${this.recoil * 0.85})`;
      ctx.beginPath();
      ctx.arc(47, -18, 8 + this.recoil * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#182112";
    ctx.beginPath();
    ctx.arc(-2, -22, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-8, -26, 8, Math.PI * 1.1, Math.PI * 1.8);
    ctx.stroke();
    ctx.restore();
  }

  drawSunflower(ctx) {
    this.drawStem(ctx);
    const petalSpin = Math.sin(this.expression + performance.now() * 0.002) * 0.08;

    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12 + petalSpin;
      const petalX = Math.cos(angle) * 24;
      const petalY = Math.sin(angle) * 24 - 12;
      const petalGradient = ctx.createLinearGradient(petalX, petalY - 10, petalX, petalY + 10);
      petalGradient.addColorStop(0, "#ffe99d");
      petalGradient.addColorStop(1, "#efa72d");
      ctx.fillStyle = petalGradient;
      ctx.beginPath();
      ctx.ellipse(petalX, petalY, 10, 18, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    const face = ctx.createRadialGradient(-4, -18, 4, 0, -12, 24);
    face.addColorStop(0, "#956336");
    face.addColorStop(1, "#553419");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, -12, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 232, 173, 0.35)";
    ctx.beginPath();
    ctx.arc(0, -12, 27, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f9f0df";
    ctx.beginPath();
    ctx.arc(-7, -16, 4, 0, Math.PI * 2);
    ctx.arc(7, -16, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1c1712";
    ctx.beginPath();
    ctx.arc(-7, -16, 1.8, 0, Math.PI * 2);
    ctx.arc(7, -16, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2d2017";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -9, 10, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }

  drawWallnut(ctx, game) {
    const wobble = Math.sin(performance.now() * 0.0025 + this.variant) * 0.02;
    ctx.rotate(wobble);

    const shell = ctx.createLinearGradient(0, -30, 0, 44);
    shell.addColorStop(0, "#bc8550");
    shell.addColorStop(1, "#774622");
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.ellipse(0, 6, game.cellWidth * 0.2, game.cellHeight * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.ellipse(-8, -12, 10, 18, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#251c15";
    ctx.beginPath();
    ctx.arc(-9, -8, 3.2, 0, Math.PI * 2);
    ctx.arc(9, -8, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#251c15";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 9, 9, 0.2, Math.PI - 0.2);
    ctx.stroke();

    if (this.health < this.maxHealth * 0.7) {
      ctx.strokeStyle = "#5f3417";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-14, 12);
      ctx.lineTo(-7, 20);
      ctx.stroke();
    }

    if (this.health < this.maxHealth * 0.35) {
      ctx.beginPath();
      ctx.moveTo(5, -2);
      ctx.lineTo(16, 8);
      ctx.lineTo(10, 18);
      ctx.stroke();
    }
  }
}

class Projectile {
  constructor(x, y, lane, damage) {
    this.x = x;
    this.y = y;
    this.lane = lane;
    this.damage = damage;
    this.radius = 8;
    this.speed = 330;
    this.active = true;
    this.trail = [];
    this.spin = Math.random() * Math.PI * 2;
  }

  update(game, deltaTime) {
    this.trail.push({ x: this.x, y: this.y, age: 1 });
    this.trail = this.trail.slice(-6).map((point) => ({ ...point, age: point.age - 0.16 }));
    this.x += this.speed * deltaTime;
    this.spin += deltaTime * 10;

    const target = game.findProjectileTarget(this);
    if (target) {
      target.takeDamage(this.damage);
      target.hitFlash = 0.25;
      this.active = false;
      if (game.spawnBlood) {
        game.spawnBlood(target, 5, 1);
      }
      game.score += 4;
      game.playSound("impact");
    }

    if (this.x > game.canvas.width + 20) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.save();

    this.trail.forEach((point, index) => {
      ctx.fillStyle = `rgba(147, 255, 118, ${Math.max(0, point.age * 0.18)})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.radius - index * 0.9, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    const gradient = ctx.createRadialGradient(-2, -2, 2, 0, 0, this.radius + 2);
    gradient.addColorStop(0, "#e5ffbc");
    gradient.addColorStop(1, "#67bf36");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 1.5, -1.2, 0.7);
    ctx.stroke();

    ctx.restore();
  }
}

class SunToken {
  constructor(x, y, value, drifting = true) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 22;
    this.drifting = drifting;
    this.age = 0;
    this.life = drifting ? 8.5 : 10;
    this.floatOffset = Math.random() * Math.PI * 2;
    this.vy = drifting ? 20 + Math.random() * 20 : 0;
    this.active = true;
    this.collectRadius = 52;
  }

  update(deltaTime) {
    this.age += deltaTime;
    if (this.drifting) {
      this.y += this.vy * deltaTime;
    }

    if (this.age > this.life) {
      this.active = false;
    }
  }

  containsPoint(x, y) {
    return Math.hypot(this.x - x, this.y - y) <= this.radius;
  }

  isNear(x, y) {
    return Math.hypot(this.x - x, this.y - y) <= this.collectRadius;
  }

  draw(ctx, totalTime) {
    const pulse = Math.sin(totalTime * 4 + this.floatOffset) * 3;

    ctx.save();
    ctx.translate(this.x, this.y + pulse);

    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10;
      ctx.strokeStyle = "rgba(255, 217, 102, 0.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 18, Math.sin(angle) * 18);
      ctx.lineTo(Math.cos(angle) * 28, Math.sin(angle) * 28);
      ctx.stroke();
    }

    const glow = ctx.createRadialGradient(-4, -5, 4, 0, 0, this.radius + 4);
    glow.addColorStop(0, "#fff7bf");
    glow.addColorStop(1, "#f7b72f");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff5d8";
    ctx.font = "bold 16px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+", 0, 1);
    ctx.restore();
  }
}

window.Plant = Plant;
window.Projectile = Projectile;
window.SunToken = SunToken;
