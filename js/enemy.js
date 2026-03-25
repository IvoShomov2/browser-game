class Enemy {
  constructor(lane, level, canvasWidth) {
    this.lane = lane;
    this.level = level;
    this.width = 54;
    this.height = 82;
    this.x = canvasWidth + 90 + Math.random() * 180;
    this.y = 0;
    this.baseSpeed = 22 + level * 1.9 + Math.random() * 7;
    this.speedMultiplier = 1;
    this.health = 120 + level * 20;
    this.maxHealth = this.health;
    this.biteDamage = 18 + level * 1.8;
    this.biteCooldown = 0;
    this.targetPlant = null;
    this.stateTimer = 0;
    this.hitFlash = 0;
    this.respawnsRemaining = level >= 3 && Math.random() > 0.55 ? 1 : 0;
    this.hasAwardedScore = false;
    this.removed = false;
    this.walkCycle = Math.random() * Math.PI * 2;

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
              enemy.moveBy(-enemy.baseSpeed * 1.05, deltaTime);
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
            game.playSound("bite");
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
          enemy.speedMultiplier = 1.85;
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
          enemy.moveBy(enemy.baseSpeed * 2.15, deltaTime);
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
            game.playSound("death");
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
    this.walkCycle += deltaTime * (this.baseSpeed * this.speedMultiplier * 0.06 + 3.8);
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
      ? "#c94d27"
      : this.fsm.matches("FLEE")
        ? "#d8a24b"
        : this.fsm.matches("SPAWN", "RESPAWN")
          ? "#8f7dff"
          : "#5a7562";
    const armSwing = Math.sin(this.walkCycle) * 8;
    const legSwing = Math.sin(this.walkCycle + Math.PI) * 7;
    const headTilt = Math.sin(this.walkCycle * 0.7) * 0.05;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = isGhosted ? 0.28 : 1;

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 40, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.hitFlash > 0) {
      ctx.fillStyle = "rgba(255, 245, 219, 0.45)";
      ctx.beginPath();
      ctx.arc(0, -12, 34, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.rotate(headTilt);
    ctx.fillStyle = "#8b6b54";
    ctx.beginPath();
    ctx.arc(0, -26, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f6f1e5";
    ctx.beginPath();
    ctx.arc(-6, -28, 4.2, 0, Math.PI * 2);
    ctx.arc(6, -28, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2a221b";
    ctx.beginPath();
    ctx.arc(-6, -28, 1.9, 0, Math.PI * 2);
    ctx.arc(6, -28, 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2a221b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.lineTo(9, -15);
    ctx.stroke();

    if (this.fsm.matches("EAT")) {
      ctx.fillStyle = "#ede1c5";
      ctx.fillRect(-4, -10, 12, 8);
    }
    ctx.restore();

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-14, -6, 28, 44);
    ctx.fillStyle = "#4d2d45";
    ctx.fillRect(-14, 2, 28, 14);
    ctx.fillStyle = "#c1433c";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 16);
    ctx.lineTo(4, 16);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#8b6b54";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-12, -1);
    ctx.lineTo(-25, 10 + armSwing);
    ctx.moveTo(12, -1);
    ctx.lineTo(25, 10 - armSwing);
    ctx.stroke();

    ctx.strokeStyle = "#3d2814";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-7, 38);
    ctx.lineTo(-9, 57 + legSwing);
    ctx.moveTo(7, 38);
    ctx.lineTo(9, 57 - legSwing);
    ctx.stroke();

    ctx.fillStyle = "#26190d";
    ctx.fillRect(-16, 56 + legSwing, 12, 6);
    ctx.fillRect(4, 56 - legSwing, 12, 6);

    ctx.fillStyle = "rgba(22, 20, 15, 0.42)";
    ctx.fillRect(-20, -48, 40, 6);
    ctx.fillStyle = this.health / this.maxHealth > 0.45 ? "#87d556" : "#ffb347";
    ctx.fillRect(-20, -48, 40 * Math.max(0, this.health / this.maxHealth), 6);

    ctx.restore();
  }
}

window.Enemy = Enemy;
