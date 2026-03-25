class Enemy {
  constructor(lane, level, canvasWidth) {
    this.lane = lane;
    this.level = level;
    this.width = 48;
    this.height = 72;
    this.x = canvasWidth + 90 + Math.random() * 160;
    this.y = 0;
    this.baseSpeed = 22 + level * 1.8 + Math.random() * 7;
    this.speedMultiplier = 1;
    this.health = 110 + level * 18;
    this.maxHealth = this.health;
    this.biteDamage = 18 + level * 1.7;
    this.biteCooldown = 0;
    this.targetPlant = null;
    this.stateTimer = 0;
    this.hitFlash = 0;
    this.respawnsRemaining = level >= 3 && Math.random() > 0.55 ? 1 : 0;
    this.hasAwardedScore = false;
    this.removed = false;

    this.fsm = new FiniteStateMachine(this, "SPAWN");
    this.setupStates();
  }

  setupStates() {
    this.fsm
      .addState("SPAWN", {
        enter: (enemy) => {
          enemy.stateTimer = 0.8;
          enemy.speedMultiplier = 0.2;
        },
        update: (enemy, game, deltaTime) => {
          enemy.stateTimer -= deltaTime;
          enemy.moveBy(-enemy.baseSpeed * enemy.speedMultiplier, deltaTime);
          if (enemy.stateTimer <= 0) {
            enemy.fsm.setState("WALK", game);
          }
        }
      })
      .addState("WALK", {
        update: (enemy, game, deltaTime) => {
          enemy.speedMultiplier = 1;
          enemy.targetPlant = game.findPlantAhead(enemy);
          enemy.moveBy(-enemy.baseSpeed * enemy.speedMultiplier, deltaTime);
        },
        transitions: [
          { condition: (enemy) => enemy.health <= 0, target: "DEAD" },
          { condition: (enemy, game) => enemy.shouldFlee(game), target: "FLEE" },
          { condition: (enemy) => enemy.health < enemy.maxHealth * 0.45, target: "RAGE" },
          { condition: (enemy) => Boolean(enemy.targetPlant), target: "TARGET" }
        ]
      })
      .addState("TARGET", {
        enter: (enemy) => {
          enemy.stateTimer = 1.6;
        },
        update: (enemy, game, deltaTime) => {
          enemy.stateTimer -= deltaTime;
          enemy.targetPlant = game.findPlantAhead(enemy);
          if (enemy.targetPlant) {
            const targetBounds = enemy.targetPlant.getBounds(game);
            const frontX = targetBounds.x + targetBounds.width;
            if (enemy.x > frontX + 6) {
              enemy.moveBy(-enemy.baseSpeed * 1.08, deltaTime);
            }
          } else {
            enemy.moveBy(-enemy.baseSpeed * 0.85, deltaTime);
          }

          if (enemy.stateTimer <= 0 && !enemy.targetPlant) {
            enemy.fsm.setState("WALK", game);
          }
        },
        transitions: [
          { condition: (enemy) => enemy.health <= 0, target: "DEAD" },
          { condition: (enemy, game) => enemy.shouldFlee(game), target: "FLEE" },
          { condition: (enemy) => enemy.health < enemy.maxHealth * 0.45, target: "RAGE" },
          { condition: (enemy, game) => enemy.canBite(game), target: "EAT" },
          { condition: (enemy) => !enemy.targetPlant && enemy.stateTimer <= 0, target: "WALK" }
        ]
      })
      .addState("EAT", {
        update: (enemy, game, deltaTime) => {
          enemy.targetPlant = game.findPlantAhead(enemy);
          enemy.biteCooldown -= deltaTime;

          if (enemy.targetPlant && enemy.biteCooldown <= 0) {
            enemy.targetPlant.takeDamage(enemy.biteDamage);
            enemy.biteCooldown = 0.75;
            game.playSound(140, 0.045, "sawtooth");
          }

          if (!enemy.targetPlant) {
            enemy.fsm.setState("WALK", game);
          }
        },
        transitions: [
          { condition: (enemy) => enemy.health <= 0, target: "DEAD" },
          { condition: (enemy, game) => enemy.shouldFlee(game), target: "FLEE" },
          { condition: (enemy) => enemy.health < enemy.maxHealth * 0.45 && !enemy.targetPlant, target: "RAGE" }
        ]
      })
      .addState("RAGE", {
        update: (enemy, game, deltaTime) => {
          enemy.speedMultiplier = 1.8;
          enemy.targetPlant = game.findPlantAhead(enemy);
          enemy.moveBy(-enemy.baseSpeed * enemy.speedMultiplier, deltaTime);
        },
        transitions: [
          { condition: (enemy) => enemy.health <= 0, target: "DEAD" },
          { condition: (enemy, game) => enemy.shouldFlee(game), target: "FLEE" },
          { condition: (enemy, game) => enemy.canBite(game), target: "EAT" }
        ]
      })
      .addState("FLEE", {
        enter: (enemy) => {
          enemy.stateTimer = 1.8;
          enemy.targetPlant = null;
        },
        update: (enemy, game, deltaTime) => {
          enemy.stateTimer -= deltaTime;
          enemy.moveBy(enemy.baseSpeed * 2.1, deltaTime);
          if (enemy.stateTimer <= 0) {
            enemy.fsm.setState("WALK", game);
          }
        },
        transitions: [{ condition: (enemy) => enemy.health <= 0, target: "DEAD" }]
      })
      .addState("DEAD", {
        enter: (enemy, game) => {
          enemy.stateTimer = 0.9;
          enemy.speedMultiplier = 0;
          enemy.targetPlant = null;
          if (!enemy.hasAwardedScore) {
            enemy.hasAwardedScore = true;
            game.score += 35;
            game.zombiesDefeated += 1;
            game.playSound(96, 0.09, "triangle");
          }
        },
        update: (enemy, game, deltaTime) => {
          enemy.stateTimer -= deltaTime;
          if (enemy.stateTimer <= 0) {
            if (enemy.respawnsRemaining > 0) {
              enemy.respawnsRemaining -= 1;
              enemy.health = Math.round(enemy.maxHealth * 0.55);
              enemy.fsm.setState("RESPAWN", game);
            } else {
              enemy.removed = true;
            }
          }
        }
      })
      .addState("RESPAWN", {
        enter: (enemy, game) => {
          enemy.stateTimer = 1.2;
          enemy.x = game.canvas.width + 130 + Math.random() * 100;
          enemy.hitFlash = 0;
        },
        update: (enemy, game, deltaTime) => {
          enemy.stateTimer -= deltaTime;
          enemy.moveBy(-enemy.baseSpeed * 0.45, deltaTime);
          if (enemy.stateTimer <= 0) {
            enemy.fsm.setState("WALK", game);
          }
        }
      });
  }

  update(game, deltaTime) {
    this.y = game.getLaneCenter(this.lane);
    this.hitFlash = Math.max(0, this.hitFlash - deltaTime);
    this.fsm.update(game, deltaTime);
  }

  moveBy(speed, deltaTime) {
    this.x += speed * deltaTime;
  }

  takeDamage(amount) {
    if (this.fsm.matches("DEAD")) {
      return;
    }
    this.health = Math.max(0, this.health - amount);
  }

  shouldFlee(game) {
    return game.scareTimer > 0 && this.health < this.maxHealth * 0.35;
  }

  canBite(game) {
    if (!this.targetPlant) {
      return false;
    }

    const bounds = this.targetPlant.getBounds(game);
    return this.x - this.width * 0.38 <= bounds.x + bounds.width;
  }

  draw(ctx) {
    const isGhosted = this.fsm.matches("DEAD");
    const bodyColor = this.fsm.matches("RAGE")
      ? "#d94b25"
      : this.fsm.matches("FLEE")
        ? "#efb44a"
        : this.fsm.matches("SPAWN", "RESPAWN")
          ? "#9b85ff"
          : "#5b7360";

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = isGhosted ? 0.28 : 1;

    if (this.hitFlash > 0) {
      ctx.fillStyle = "#fff5db";
      ctx.beginPath();
      ctx.arc(0, -12, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-14, -8, 28, 42);

    ctx.fillStyle = "#7d5a43";
    ctx.beginPath();
    ctx.arc(0, -20, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f8f4e6";
    ctx.beginPath();
    ctx.arc(-6, -22, 4, 0, Math.PI * 2);
    ctx.arc(6, -22, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#31251d";
    ctx.beginPath();
    ctx.arc(-6, -22, 1.8, 0, Math.PI * 2);
    ctx.arc(6, -22, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#31251d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -12);
    ctx.lineTo(8, -10);
    ctx.stroke();

    ctx.fillStyle = "#422a15";
    ctx.fillRect(-16, 34, 10, 18);
    ctx.fillRect(6, 34, 10, 18);

    ctx.fillStyle = "rgba(31, 28, 22, 0.4)";
    ctx.fillRect(-20, -38, 40, 6);
    ctx.fillStyle = this.health / this.maxHealth > 0.45 ? "#7fba43" : "#ef8f2f";
    ctx.fillRect(-20, -38, 40 * Math.max(0, this.health / this.maxHealth), 6);

    ctx.restore();
  }
}

window.Enemy = Enemy;
