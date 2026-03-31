class Enemy {
  static nextId = 1;

  constructor(lane, level, canvasWidth, difficultySettings = null) {
    this.id = Enemy.nextId++;
    this.lane = lane;
    this.level = level;
    this.width = 58;
    this.height = 92;
    this.x = canvasWidth + 90 + Math.random() * 180;
    this.y = 0;
    this.renderX = this.x;
    this.renderY = 0;
    this.animState = "walking";
    this.animTime = Math.random() * Math.PI * 2;
    this.lifeSeed = Math.random() * Math.PI * 2;
    this.swayAmplitude = 0.9 + Math.random() * 1.8;
    this.bobAmplitude = 0.8 + Math.random() * 1.6;
    this.tiltAmplitude = 0.35 + Math.random() * 0.8;
    this.easeSpeed = 10 + Math.random() * 5;
    this.bobDuration = 0.54 + Math.random() * 0.2;
    this.visualOffsetX = 0;
    this.visualOffsetY = 0;
    this.visualRotate = 0;
    this.visualScale = 1;
    const speedMultiplier = difficultySettings && typeof difficultySettings.zombieSpeed === "number" ? difficultySettings.zombieSpeed : 1;
    this.baseSpeed = (21 + level * 1.9 + Math.random() * 7) * speedMultiplier;
    this.speedMultiplier = 1;
    this.health = difficultySettings && typeof difficultySettings.zombieHealth === "number" ? difficultySettings.zombieHealth : (120 + level * 20);
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
    this.skinTone = ["#8e9b78", "#93a57a", "#84966e"][Math.floor(Math.random() * 3)];
    this.jacket = ["#60432d", "#694932", "#57402c"][Math.floor(Math.random() * 3)];
    this.tie = ["#b7372a", "#af2020", "#9f3d18"][Math.floor(Math.random() * 3)];
    this.pants = ["#4b5e88", "#40537d", "#53658a"][Math.floor(Math.random() * 3)];
    this.leftArmLost = false;
    this.rightArmLost = false;
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
          enemy.speedMultiplier = 1.9;
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
              enemy.leftArmLost = false;
              enemy.rightArmLost = false;
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

    const isWalkingState = this.fsm.matches("SPAWN") || this.fsm.matches("WALK") || this.fsm.matches("RAGE") || this.fsm.matches("FLEE") || this.fsm.matches("RESPAWN");
    this.animState = isWalkingState ? "walking" : "idle";
    this.animTime += deltaTime * (isWalkingState ? 7.2 : 2.2);

    const pace = this.animState === "walking" ? 1 : 0.28;
    const wobbleTime = this.animTime + this.lifeSeed + performance.now() * 0.00035;
    this.visualOffsetX = Math.sin(wobbleTime * 2.4) * this.swayAmplitude * pace;
    this.visualOffsetY = Math.cos(wobbleTime * 3.2) * this.bobAmplitude * pace;
    this.visualRotate = Math.sin(wobbleTime * 1.7) * this.tiltAmplitude * pace;
    this.visualScale = 1 + Math.sin(wobbleTime * 1.15) * 0.008 * pace;

    // Exponential easing gives smooth, frame-rate independent interpolation.
    const smoothing = 1 - Math.exp(-this.easeSpeed * deltaTime);
    this.renderX += (this.x - this.renderX) * smoothing;
    this.renderY += (this.y - this.renderY) * smoothing;
  }

  moveBy(speed, deltaTime) {
    this.x += speed * deltaTime;
  }

  takeDamage(amount) {
    if (this.fsm.matches("DEAD")) {
      return;
    }
    const previousHealth = this.health;
    this.health = Math.max(0, this.health - amount);
    if (!this.leftArmLost && previousHealth > this.maxHealth * 0.72 && this.health <= this.maxHealth * 0.72) {
      this.leftArmLost = true;
    }
    if (!this.rightArmLost && previousHealth > this.maxHealth * 0.38 && this.health <= this.maxHealth * 0.38) {
      this.rightArmLost = true;
    }
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
    const now = Date.now() * 0.001;
    const pace = this.animState === "walking" ? 1 : 0.28;
    const swingTime = this.animTime + now * 0.8;
    const armSwing = Math.sin(swingTime * 2.1) * (10 * pace);
    const forearmSwing = Math.sin(swingTime * 2.1 + 0.7) * (7 * pace);
    const legSwing = Math.sin(swingTime * 2.1 + Math.PI) * (8 * pace);
    const footDrag = Math.cos(swingTime * 2.1) * (4 * pace);
    const headTilt = Math.sin(swingTime * 1.2) * (0.08 * pace + 0.02);
    const bodyLean = this.fsm.matches("RAGE") ? -0.18 : this.fsm.matches("FLEE") ? 0.08 : -0.12;
    const bodyBob = Math.sin(swingTime * 3.2) * (this.animState === "walking" ? 3.1 : 1.1);
    const jacket = this.fsm.matches("RAGE") ? "#7d3926" : this.jacket;
    const lifeScale = 1 + Math.sin(swingTime * 1.05) * (this.animState === "walking" ? 0.012 : 0.006);

    ctx.save();
    ctx.translate(this.renderX, this.renderY + bodyBob);
    ctx.globalAlpha = isGhosted ? 0.28 : 1;

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 44, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.hitFlash > 0) {
      ctx.fillStyle = "rgba(255, 245, 219, 0.45)";
      ctx.beginPath();
      ctx.arc(-4, -10, 34, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.rotate(bodyLean);
    ctx.scale(lifeScale, lifeScale);

    ctx.strokeStyle = this.skinTone;
    ctx.lineCap = "round";
    ctx.lineWidth = 9;
    ctx.beginPath();
    if (!this.leftArmLost) {
      ctx.moveTo(-12, -2);
      ctx.lineTo(-27, 13 + armSwing);
    }
    if (!this.rightArmLost) {
      ctx.moveTo(11, 1);
      ctx.lineTo(26, 16 - forearmSwing);
    }
    ctx.stroke();

    ctx.fillStyle = jacket;
    ctx.beginPath();
    ctx.moveTo(-17, -8);
    ctx.lineTo(16, -12);
    ctx.lineTo(20, 28);
    ctx.lineTo(-12, 34);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#efe7d7";
    ctx.beginPath();
    ctx.moveTo(-5, -8);
    ctx.lineTo(7, -9);
    ctx.lineTo(9, 28);
    ctx.lineTo(-5, 31);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.tie;
    ctx.beginPath();
    ctx.moveTo(2, -6);
    ctx.lineTo(-2, 6);
    ctx.lineTo(4, 28);
    ctx.lineTo(10, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.pants;
    ctx.beginPath();
    ctx.moveTo(-13, 29);
    ctx.lineTo(17, 25);
    ctx.lineTo(16, 54);
    ctx.lineTo(-14, 58);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.pants;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-7, 54);
    ctx.lineTo(-11, 73 + legSwing);
    ctx.moveTo(6, 52);
    ctx.lineTo(10, 74 - legSwing * 0.85);
    ctx.stroke();

    ctx.fillStyle = "#2a1b11";
    ctx.fillRect(-22, 71 + legSwing, 18, 7);
    ctx.fillRect(2, 72 - legSwing * 0.85 + footDrag, 18, 7);

    ctx.save();
    ctx.translate(-1, -28);
    ctx.rotate(headTilt);

    ctx.fillStyle = this.skinTone;
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.quadraticCurveTo(-19, -31, -2, -38);
    ctx.quadraticCurveTo(16, -36, 18, -17);
    ctx.quadraticCurveTo(18, -1, 8, 10);
    ctx.lineTo(-8, 10);
    ctx.quadraticCurveTo(-17, 4, -16, -6);
    ctx.fill();

    ctx.fillStyle = "#fff9e8";
    ctx.beginPath();
    ctx.ellipse(-8, -15, 6, 8, -0.18, 0, Math.PI * 2);
    ctx.ellipse(7, -12, 6.5, 8.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1b1712";
    ctx.beginPath();
    ctx.arc(-7, -13, 2.1, 0, Math.PI * 2);
    ctx.arc(8, -11, 2.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1b1712";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -1);
    ctx.lineTo(2, 3);
    ctx.stroke();

    ctx.fillStyle = "#efe1c6";
    ctx.beginPath();
    ctx.moveTo(-3, 2);
    ctx.lineTo(10, 2);
    ctx.lineTo(10, 11);
    ctx.lineTo(-1, 8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#d4c1a0";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, 10);
    ctx.moveTo(4, 2);
    ctx.lineTo(4, 10);
    ctx.stroke();

    ctx.strokeStyle = "#43503c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-14, -34);
    ctx.lineTo(-16, -42);
    ctx.moveTo(-7, -37);
    ctx.lineTo(-8, -45);
    ctx.moveTo(2, -36);
    ctx.lineTo(4, -44);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    ctx.fillStyle = "rgba(22, 20, 15, 0.42)";
    ctx.fillRect(-21, -56, 42, 6);
    ctx.fillStyle = this.health / this.maxHealth > 0.45 ? "#87d556" : "#ffb347";
    ctx.fillRect(-21, -56, 42 * Math.max(0, this.health / this.maxHealth), 6);

    ctx.restore();
  }
}

window.Enemy = Enemy;

