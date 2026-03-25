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
  }

  update(game, deltaTime) {
    this.shake = Math.max(0, this.shake - deltaTime * 4);

    if (this.type === "peashooter") {
      this.reload -= deltaTime;
      if (this.reload <= 0 && game.hasZombieAhead(this.row, this.col)) {
        const position = this.getCenter(game);
        game.projectiles.push(
          new Projectile(
            position.x + game.cellWidth * 0.18,
            position.y - game.cellHeight * 0.04,
            this.row,
            this.damage
          )
        );
        this.reload = this.reloadTime;
        game.playSound(520, 0.045, "square");
      }
    }

    if (this.type === "sunflower") {
      this.sunTimer -= deltaTime;
      if (this.sunTimer <= 0) {
        const position = this.getCenter(game);
        game.spawnSun(position.x, position.y - 24, 25, false);
        this.sunTimer = this.sunInterval;
        game.playSound(710, 0.05, "sine");
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

  draw(ctx, game) {
    const cell = game.getCellRect(this.col, this.row);
    const center = this.getCenter(game);
    const bounce = Math.sin(game.totalTime * 5 + this.col + this.row) * 2;
    const scale = 1 - this.shake * 0.06;

    ctx.save();
    ctx.translate(center.x, center.y + bounce);
    ctx.scale(scale, scale);

    if (this.type === "peashooter") {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 10, game.cellWidth * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.highlight;
      ctx.beginPath();
      ctx.arc(0, -10, game.cellWidth * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillRect(-8, -14, 26, 10);

      ctx.fillStyle = "#2d2b1f";
      ctx.beginPath();
      ctx.arc(16, -9, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.type === "sunflower") {
      for (let index = 0; index < 10; index += 1) {
        const angle = (Math.PI * 2 * index) / 10;
        const petalX = Math.cos(angle) * 18;
        const petalY = Math.sin(angle) * 18;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(petalX, petalY - 3, 8, 14, angle, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = this.highlight;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.type === "wallnut") {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 6, game.cellWidth * 0.18, game.cellHeight * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.highlight;
      ctx.beginPath();
      ctx.arc(-8, -6, 3.5, 0, Math.PI * 2);
      ctx.arc(8, -6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#6c4020";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 12, 10, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    ctx.restore();

    const healthRatio = this.health / this.maxHealth;
    ctx.fillStyle = "rgba(31, 28, 22, 0.35)";
    ctx.fillRect(cell.x + 12, cell.y + cell.height - 12, cell.width - 24, 6);
    ctx.fillStyle = healthRatio > 0.45 ? "#7fba43" : "#ef8f2f";
    ctx.fillRect(cell.x + 12, cell.y + cell.height - 12, (cell.width - 24) * healthRatio, 6);
  }
}

class Projectile {
  constructor(x, y, lane, damage) {
    this.x = x;
    this.y = y;
    this.lane = lane;
    this.damage = damage;
    this.radius = 8;
    this.speed = 310;
    this.active = true;
  }

  update(game, deltaTime) {
    this.x += this.speed * deltaTime;

    const target = game.findProjectileTarget(this);
    if (target) {
      target.takeDamage(this.damage);
      target.hitFlash = 0.25;
      this.active = false;
      game.score += 4;
      game.playSound(280, 0.03, "triangle");
    }

    if (this.x > game.canvas.width + 20) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "#9cdc5b";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class SunToken {
  constructor(x, y, value, drifting = true) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 20;
    this.drifting = drifting;
    this.age = 0;
    this.life = drifting ? 8.5 : 10;
    this.floatOffset = Math.random() * Math.PI * 2;
    this.vy = drifting ? 22 + Math.random() * 18 : 0;
    this.active = true;
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

  draw(ctx, totalTime) {
    const pulse = Math.sin(totalTime * 4 + this.floatOffset) * 2;

    ctx.save();
    ctx.translate(this.x, this.y + pulse);
    ctx.fillStyle = "#ffd457";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff6de";
    ctx.font = "bold 14px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+", 0, 1);
    ctx.restore();
  }
}

window.Plant = Plant;
window.Projectile = Projectile;
window.SunToken = SunToken;
