const game = {
  canvas: null,
  ctx: null,
  grid: { cols: 8, rows: 5, left: 120, top: 130, width: 0, height: 0 },
  cellWidth: 0,
  cellHeight: 0,
  plantConfigs: {
    peashooter: { type: "peashooter", name: "Peashooter", cost: 100, maxHealth: 110, reloadTime: 1.02, damage: 20, color: "#65b646", highlight: "#8ce667", description: "Fast ranged pressure with reliable pea fire." },
    sunflower: { type: "sunflower", name: "Sunflower", cost: 50, maxHealth: 90, sunInterval: 6.4, color: "#f6b940", highlight: "#845834", description: "Build economy and keep your sun reserve healthy." },
    wallnut: { type: "wallnut", name: "Wallnut", cost: 75, maxHealth: 460, color: "#a86d3a", highlight: "#2c2118", description: "Soaks heavy lane pressure and protects shooters." }
  },
  selectedPlant: "peashooter",
  plants: [], projectiles: [], enemies: [], suns: [], particles: [], mowers: [],
  mouse: { x: 0, y: 0, down: false }, keys: {}, state: "menu",
  baseHealth: 100, sun: 150, score: 0, level: 1, wave: 1, zoom: 1,
  totalTime: 0, lastTime: 0, scareTimer: 0, zombiesDefeated: 0, screenShake: 0,
  laneWarnings: [0, 0, 0, 0, 0], waveTimer: 19, waveDuration: 19, currentWaveSize: 3,
  zombiesSpawnedThisWave: 0, nextSpawnDelay: 1.4, spawnClock: 1.4,
  spawnIntervalId: null, sunIntervalId: null, waveIntervalId: null, animationFrameId: 0,
  audioContext: null, noiseBuffer: null, isMuted: false, listenersBound: false, dom: {}
};

function setup() {
  game.canvas = document.getElementById("gameCanvas");
  game.ctx = game.canvas.getContext("2d");
  cacheDom();
  bindUi();
  bindEvents();
  resizeCanvas();
  resetRun();
  updateHud();
  draw();
  game.animationFrameId = requestAnimationFrame(loop);
}

function cacheDom() {
  game.dom = {
    overlays: { menu: document.getElementById("menuOverlay"), pause: document.getElementById("pauseOverlay"), gameOver: document.getElementById("gameOverOverlay") },
    playButton: document.getElementById("playButton"),
    resumeButton: document.getElementById("resumeButton"),
    restartButton: document.getElementById("restartButton"),
    muteButton: document.getElementById("muteButton"),
    healthValue: document.getElementById("healthValue"),
    sunValue: document.getElementById("sunValue"),
    scoreValue: document.getElementById("scoreValue"),
    levelValue: document.getElementById("levelValue"),
    waveValue: document.getElementById("waveValue"),
    zoomValue: document.getElementById("zoomValue"),
    statusValue: document.getElementById("statusValue"),
    finalScoreValue: document.getElementById("finalScoreValue"),
    finalWaveValue: document.getElementById("finalWaveValue"),
    gameOverTitle: document.getElementById("gameOverTitle"),
    gameOverText: document.getElementById("gameOverText"),
    tipLine: document.getElementById("tipLine"),
    seedButtons: Array.from(document.querySelectorAll(".seed-button"))
  };
}

function bindUi() {
  game.dom.playButton.addEventListener("click", startGame);
  game.dom.resumeButton.addEventListener("click", resumeGame);
  game.dom.restartButton.addEventListener("click", restartGame);
  game.dom.muteButton.addEventListener("click", toggleMute);
  game.dom.seedButtons.forEach((button) => button.addEventListener("click", () => selectPlant(button.dataset.seed)));

  document.addEventListener("gameStart", () => {
    game.state = "running";
    showOverlay(null);
    setTip("Establish sun income early, then lock each lane with damage and blockers.");
    updateHud();
  });

  document.addEventListener("gameOver", (event) => {
    const win = Boolean(event.detail && event.detail.win);
    game.state = "gameover";
    stopTimers();
    showOverlay("gameOver");
    game.dom.finalScoreValue.textContent = String(game.score);
    game.dom.finalWaveValue.textContent = String(game.wave);
    game.dom.gameOverTitle.textContent = win ? "Victory" : "Game Over";
    game.dom.gameOverText.textContent = win ? "The garden held the line and the season is saved." : "The zombies broke the defense before the garden could recover.";
    setTip(win ? "Beautiful hold. Your garden made it through the season." : "Try opening with extra sunflowers, then reinforce weak lanes faster.");
    updateHud();
  });

  document.addEventListener("levelUp", () => {
    game.playSound("wave");
    game.screenShake = 0.16;
    setTip(`Wave ${game.wave} is live. Expect harder pressure and faster zombies.`);
  });
}

function bindEvents() {
  if (game.listenersBound) return;
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("keypress", handleKeyPress);
  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  game.canvas.addEventListener("mousemove", handleMouseMove);
  game.canvas.addEventListener("click", handleCanvasClick);
  game.canvas.addEventListener("mousedown", handleMouseDown);
  game.canvas.addEventListener("mouseup", handleMouseUp);
  game.canvas.addEventListener("contextmenu", handleContextMenu);
  game.canvas.addEventListener("wheel", handleWheel, { passive: false });
  game.listenersBound = true;
}

function resizeCanvas() {
  game.canvas.width = window.innerWidth;
  game.canvas.height = window.innerHeight;
  const sidebarWidth = window.innerWidth > 980 ? 310 : 0;
  game.grid.left = Math.max(72, window.innerWidth * 0.12);
  game.grid.top = Math.max(124, window.innerHeight * 0.18);
  game.grid.width = Math.min(window.innerWidth - game.grid.left - Math.max(32, sidebarWidth), 960) * game.zoom;
  game.grid.height = Math.min(window.innerHeight - game.grid.top - 82, 530) * game.zoom;
  game.cellWidth = game.grid.width / game.grid.cols;
  game.cellHeight = game.grid.height / game.grid.rows;
  alignLaneMowers();
  draw();
}

function createMower(row) {
  return { row, x: game.grid.left - 58, y: getLaneCenter(row), active: true, triggered: false, speed: 0, width: 62, height: 34, spin: 0, sparkTimer: 0 };
}

function alignLaneMowers() {
  game.mowers.forEach((mower, row) => {
    mower.row = row;
    mower.y = getLaneCenter(row);
    if (!mower.triggered) mower.x = game.grid.left - 58;
  });
}

function resetRun() {
  game.plants = [];
  game.projectiles = [];
  game.enemies = [];
  game.suns = [];
  game.particles = [];
  game.baseHealth = 100;
  game.sun = 150;
  game.score = 0;
  game.level = 1;
  game.wave = 1;
  game.totalTime = 0;
  game.scareTimer = 0;
  game.zombiesDefeated = 0;
  game.lastTime = 0;
  game.screenShake = 0;
  game.laneWarnings = [0, 0, 0, 0, 0];
  game.waveTimer = game.waveDuration;
  game.currentWaveSize = 3;
  game.zombiesSpawnedThisWave = 0;
  game.nextSpawnDelay = 1.4;
  game.spawnClock = 1.4;
  game.mowers = Array.from({ length: game.grid.rows }, (_, row) => createMower(row));
  alignLaneMowers();
  selectPlant("peashooter");
  setTip("Build a balanced defense: economy first, then damage, then blockers.");
  updateHud();
}

function startGame() { resetRun(); startTimers(); document.dispatchEvent(new CustomEvent("gameStart")); game.playSound("start"); }
function resumeGame() { if (game.state !== "paused") return; game.state = "running"; showOverlay(null); game.playSound("start"); updateHud(); }
function pauseGame() { if (game.state !== "running") return; game.state = "paused"; showOverlay("pause"); game.playSound("pause"); updateHud(); }
function restartGame() { showOverlay(null); startGame(); }
function endGame(win) { game.playSound(win ? "victory" : "fail"); document.dispatchEvent(new CustomEvent("gameOver", { detail: { win } })); }

function startTimers() {
  stopTimers();
  game.sunIntervalId = window.setInterval(() => {
    if (game.state === "running") {
      spawnSun(game.grid.left + 80 + Math.random() * (game.grid.width - 160), game.grid.top - 36, 25, true);
      game.playSound("sun-drift");
    }
  }, 5200);

  game.waveIntervalId = window.setInterval(() => {
    if (game.state === "running") advanceWave();
  }, game.waveDuration * 1000);
}

function stopTimers() { window.clearInterval(game.spawnIntervalId); window.clearInterval(game.sunIntervalId); window.clearInterval(game.waveIntervalId); }

function loop(timestamp) {
  if (!game.lastTime) game.lastTime = timestamp;
  const deltaTime = Math.min((timestamp - game.lastTime) / 1000, 0.033);
  game.lastTime = timestamp;
  if (game.state === "running") update(deltaTime);
  draw();
  game.animationFrameId = requestAnimationFrame(loop);
}

function update(deltaTime) {
  game.totalTime += deltaTime;
  game.scareTimer = Math.max(0, game.scareTimer - deltaTime);
  game.screenShake = Math.max(0, game.screenShake - deltaTime * 1.8);
  game.laneWarnings = game.laneWarnings.map(() => 0);
  game.waveTimer = Math.max(0, game.waveTimer - deltaTime);
  game.spawnClock -= deltaTime;

  if (game.zombiesSpawnedThisWave < game.currentWaveSize && game.spawnClock <= 0) {
    spawnEnemy();
    game.zombiesSpawnedThisWave += 1;
    game.nextSpawnDelay = Math.max(0.45, 1.5 - game.level * 0.06 - game.wave * 0.02 + Math.random() * 0.25);
    game.spawnClock = game.nextSpawnDelay;
  }

  game.plants.forEach((plant) => plant.update(game, deltaTime));
  game.projectiles.forEach((projectile) => projectile.update(game, deltaTime));
  game.enemies.forEach((enemy) => {
    enemy.update(game, deltaTime);
    if (!enemy.fsm.matches("DEAD")) {
      const progress = 1 - (enemy.x - game.grid.left) / game.grid.width;
      game.laneWarnings[enemy.lane] = Math.max(game.laneWarnings[enemy.lane], Math.max(0, progress));
    }
    checkMowerTrigger(enemy);
    if (!enemy.fsm.matches("DEAD") && enemy.x < game.grid.left - 18) {
      const mower = game.mowers[enemy.lane];
      if (!mower || !mower.active) {
        game.baseHealth = Math.max(0, game.baseHealth - 18);
        enemy.removed = true;
        game.screenShake = 0.22;
        game.playSound("breach");
        setTip(`Lane ${enemy.lane + 1} was breached. Reinforce weak lanes earlier.`);
        if (game.baseHealth <= 0) endGame(false);
      }
    }
  });

  updateMowers(deltaTime);
  game.suns.forEach((sun) => {
    sun.update(deltaTime);
    if (sun.active && sun.isNear(game.mouse.x, game.mouse.y)) collectSun(sun, true);
  });
  updateParticles(deltaTime);

  game.plants = game.plants.filter((plant) => !plant.isDead());
  game.projectiles = game.projectiles.filter((projectile) => projectile.active);
  game.enemies = game.enemies.filter((enemy) => !enemy.removed);
  game.suns = game.suns.filter((sun) => sun.active);
  game.particles = game.particles.filter((particle) => particle.life > 0 && particle.alpha > 0.02);
  if (game.wave >= 8 && game.zombiesDefeated >= 26 && game.state === "running") endGame(true);
  updateHud();
}

function checkMowerTrigger(enemy) {
  if (enemy.fsm.matches("DEAD")) return;
  const mower = game.mowers[enemy.lane];
  if (!mower || !mower.active || mower.triggered) return;
  if (enemy.x - enemy.width * 0.45 <= mower.x + mower.width * 0.45) {
    mower.triggered = true;
    mower.speed = 640;
    game.screenShake = 0.15;
    spawnSparks(mower.x + 14, mower.y + 8, 14);
    game.playSound("mower");
    setTip(`Lane ${enemy.lane + 1} lawnmower activated.`);
  }
}

function updateMowers(deltaTime) {
  game.mowers.forEach((mower) => {
    if (!mower.active || !mower.triggered) return;
    mower.x += mower.speed * deltaTime;
    mower.spin += deltaTime * 18;
    mower.sparkTimer -= deltaTime;
    if (mower.sparkTimer <= 0) {
      mower.sparkTimer = 0.05;
      spawnSparks(mower.x - 18, mower.y + 12, 3);
    }
    game.enemies.forEach((enemy) => {
      if (enemy.lane !== mower.row || enemy.fsm.matches("DEAD")) return;
      if (Math.abs(enemy.x - mower.x) < mower.width * 0.6) {
        spawnBlood(enemy, 12, 1.8);
        enemy.takeDamage(enemy.maxHealth * 4);
        enemy.hitFlash = 0.35;
      }
    });
    if (mower.x > game.grid.left + game.grid.width + 140) mower.active = false;
  });
}

function updateParticles(deltaTime) {
  game.particles.forEach((particle) => {
    particle.life -= deltaTime;
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.vx *= 0.985;
    particle.vy += particle.gravity * deltaTime;
    particle.rotation += particle.spin * deltaTime;
    particle.alpha = Math.max(0, particle.life / particle.maxLife);
    particle.size = Math.max(0.5, particle.size - deltaTime * particle.shrink);
  });
}

function spawnBlood(enemy, count = 6, spread = 1) {
  for (let index = 0; index < count; index += 1) {
    const life = 0.45 + Math.random() * 0.35;
    game.particles.push({ x: enemy.x - 18 + Math.random() * 14, y: enemy.y - 18 + Math.random() * 24, vx: (-40 - Math.random() * 120) * spread, vy: -60 + Math.random() * 80, gravity: 190, life, maxLife: life, alpha: 1, size: 3 + Math.random() * 4, shrink: 2.2, rotation: Math.random() * Math.PI * 2, spin: -4 + Math.random() * 8, color: Math.random() > 0.4 ? "rgba(155, 16, 19, 0.95)" : "rgba(109, 8, 10, 0.9)", kind: "blood" });
  }
}

function spawnZombieParts(enemy, severe = false, damage = 0) {
  const parts = severe ? ["arm", "arm", "chunk", "chunk", "head"] : ["arm", "chunk"];
  const partCount = severe ? 4 : (damage >= 18 ? 2 : 1);
  for (let index = 0; index < partCount; index += 1) {
    const kind = parts[Math.floor(Math.random() * parts.length)];
    const life = 0.7 + Math.random() * 0.55;
    game.particles.push({
      x: enemy.x - 10 + Math.random() * 22,
      y: enemy.y - 26 + Math.random() * 32,
      vx: -30 - Math.random() * 110,
      vy: -120 + Math.random() * 110,
      gravity: 240,
      life,
      maxLife: life,
      alpha: 1,
      size: kind === "head" ? 10 : kind === "arm" ? 8 : 6,
      shrink: 0.35,
      rotation: Math.random() * Math.PI * 2,
      spin: -8 + Math.random() * 16,
      color: kind === "chunk" ? "#7f4f31" : enemy.skinTone || "#8e9b78",
      kind
    });
  }
}

function spawnSparks(x, y, count = 8) {
  for (let index = 0; index < count; index += 1) {
    const life = 0.22 + Math.random() * 0.2;
    game.particles.push({ x, y, vx: -40 + Math.random() * 110, vy: -90 + Math.random() * 70, gravity: 220, life, maxLife: life, alpha: 1, size: 2 + Math.random() * 2, shrink: 5, rotation: Math.random() * Math.PI * 2, spin: -8 + Math.random() * 16, color: Math.random() > 0.5 ? "rgba(255, 214, 92, 0.95)" : "rgba(255, 247, 184, 0.95)", kind: "spark" });
  }
}
function draw() {
  const ctx = game.ctx;
  ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
  ctx.save();
  if (game.screenShake > 0) {
    const amount = game.screenShake * 7;
    ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
  }
  drawBackground(ctx);
  drawGrid(ctx);
  drawMowers(ctx);
  drawPreview(ctx);
  drawPlants(ctx);
  drawProjectiles(ctx);
  drawEnemies(ctx);
  drawParticles(ctx);
  drawSuns(ctx);
  drawLaneLabels(ctx);
  ctx.restore();
}

function drawBackground(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, game.canvas.height);
  sky.addColorStop(0, "#f7c98e");
  sky.addColorStop(0.2, "#f4de9f");
  sky.addColorStop(0.42, "#d7df9b");
  sky.addColorStop(0.76, "#86b351");
  sky.addColorStop(1, "#597c37");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

  const sunX = game.grid.left + game.grid.width * 0.64;
  const sunY = game.grid.top - 6;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
  sunGlow.addColorStop(0, "rgba(255, 238, 140, 0.95)");
  sunGlow.addColorStop(0.4, "rgba(255, 190, 88, 0.48)");
  sunGlow.addColorStop(1, "rgba(255, 160, 68, 0)");
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd25f";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 230, 146, 0.55)";
  ctx.lineWidth = 3;
  for (let ray = 0; ray < 10; ray += 1) {
    const angle = (Math.PI * 2 * ray) / 10;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(angle) * 26, sunY + Math.sin(angle) * 26);
    ctx.lineTo(sunX + Math.cos(angle) * 40, sunY + Math.sin(angle) * 40);
    ctx.stroke();
  }

  drawCloud(ctx, 170, 85, 1.2);
  drawCloud(ctx, 470, 118, 0.95);
  drawCloud(ctx, 920, 88, 1.1);

  ctx.fillStyle = "#a8d08c";
  ctx.beginPath();
  ctx.moveTo(0, game.grid.top + 26);
  ctx.quadraticCurveTo(180, game.grid.top - 90, 360, game.grid.top + 16);
  ctx.quadraticCurveTo(560, game.grid.top + 88, 780, game.grid.top + 4);
  ctx.quadraticCurveTo(980, game.grid.top - 78, game.canvas.width, game.grid.top + 22);
  ctx.lineTo(game.canvas.width, game.grid.top + 150);
  ctx.lineTo(0, game.grid.top + 150);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#86b36e";
  ctx.beginPath();
  ctx.moveTo(0, game.grid.top + 72);
  ctx.quadraticCurveTo(220, game.grid.top - 6, 440, game.grid.top + 62);
  ctx.quadraticCurveTo(650, game.grid.top + 114, 880, game.grid.top + 38);
  ctx.quadraticCurveTo(1080, game.grid.top - 4, game.canvas.width, game.grid.top + 74);
  ctx.lineTo(game.canvas.width, game.grid.top + 170);
  ctx.lineTo(0, game.grid.top + 170);
  ctx.closePath();
  ctx.fill();

  drawDriveway(ctx);
  drawHouse(ctx);
  drawFence(ctx);
  drawRightHedge(ctx);
  drawFlowerScatter(ctx);
  drawGrassBorder(ctx);
}

function drawCloud(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.arc(30, -10, 22, 0, Math.PI * 2);
  ctx.arc(56, 2, 20, 0, Math.PI * 2);
  ctx.arc(22, 10, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDriveway(ctx) {
  const pathX = game.grid.left - 110;
  const pathWidth = 84;
  ctx.fillStyle = "#d7c5a6";
  ctx.beginPath();
  ctx.moveTo(pathX, game.grid.top - 2);
  ctx.lineTo(pathX + pathWidth, game.grid.top - 16);
  ctx.lineTo(pathX + pathWidth + 14, game.grid.top + game.grid.height + 32);
  ctx.lineTo(pathX - 10, game.grid.top + game.grid.height + 48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(112, 90, 68, 0.22)";
  for (let index = 0; index < 9; index += 1) {
    const y = game.grid.top + index * (game.grid.height / 8.5);
    ctx.beginPath();
    ctx.moveTo(pathX + 6, y);
    ctx.lineTo(pathX + pathWidth + 10, y - 12);
    ctx.stroke();
  }
}

function drawHouse(ctx) {
  const towerX = game.grid.left - 108;
  const towerY = game.grid.top - 8;
  const towerWidth = 82;
  const towerHeight = game.grid.height + 36;

  const brickColors = ["#8e633e", "#a2774f", "#6d4a30", "#b18860"];
  const brickW = 22;
  const brickH = 18;

  ctx.fillStyle = "#4d311c";
  ctx.fillRect(towerX - 4, towerY - 6, towerWidth + 8, towerHeight + 10);

  for (let row = 0; row < Math.ceil(towerHeight / brickH); row += 1) {
    for (let col = 0; col < Math.ceil(towerWidth / brickW) + 1; col += 1) {
      const x = towerX + col * brickW - (row % 2) * 11;
      const y = towerY + row * brickH;
      ctx.fillStyle = brickColors[(row + col) % brickColors.length];
      ctx.fillRect(x, y, brickW - 2, brickH - 2);
    }
  }

  ctx.strokeStyle = "rgba(55, 34, 19, 0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(towerX, towerY, towerWidth, towerHeight);

  const annexX = towerX - 54;
  const annexY = game.grid.top + game.cellHeight * 0.92;
  const annexW = 58;
  const annexH = 78;

  ctx.fillStyle = "#d8bc8e";
  ctx.fillRect(annexX, annexY, annexW, annexH);
  ctx.strokeStyle = "#5b3d21";
  ctx.strokeRect(annexX, annexY, annexW, annexH);

  ctx.fillStyle = "#7a5330";
  ctx.beginPath();
  ctx.moveTo(annexX - 8, annexY + 8);
  ctx.lineTo(annexX + annexW / 2, annexY - 22);
  ctx.lineTo(annexX + annexW + 8, annexY + 8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 225, 170, 0.2)";
  for (let tile = 0; tile < 5; tile += 1) {
    ctx.beginPath();
    ctx.moveTo(annexX + 4 + tile * 11, annexY + 2);
    ctx.lineTo(annexX + 14 + tile * 11, annexY + 12);
    ctx.stroke();
  }

  ctx.fillStyle = "#acd2ea";
  ctx.fillRect(annexX + 8, annexY + 22, 12, 16);
  ctx.fillRect(annexX + 34, annexY + 22, 12, 16);
  ctx.strokeStyle = "#4f341c";
  ctx.strokeRect(annexX + 8, annexY + 22, 12, 16);
  ctx.strokeRect(annexX + 34, annexY + 22, 12, 16);
  ctx.beginPath();
  ctx.moveTo(annexX + 14, annexY + 22);
  ctx.lineTo(annexX + 14, annexY + 38);
  ctx.moveTo(annexX + 8, annexY + 30);
  ctx.lineTo(annexX + 20, annexY + 30);
  ctx.moveTo(annexX + 40, annexY + 22);
  ctx.lineTo(annexX + 40, annexY + 38);
  ctx.moveTo(annexX + 34, annexY + 30);
  ctx.lineTo(annexX + 46, annexY + 30);
  ctx.stroke();

  ctx.fillStyle = "#674222";
  ctx.fillRect(annexX + 21, annexY + 48, 14, 30);
  ctx.strokeRect(annexX + 21, annexY + 48, 14, 30);

  ctx.fillStyle = "#d8c6a2";
  ctx.beginPath();
  ctx.moveTo(towerX - 20, game.grid.top + game.grid.height + 18);
  ctx.lineTo(towerX + 20, game.grid.top + game.grid.height - 6);
  ctx.lineTo(towerX + 20, game.grid.top + game.grid.height + 40);
  ctx.lineTo(towerX - 20, game.grid.top + game.grid.height + 40);
  ctx.closePath();
  ctx.fill();

  for (let row = 0; row < game.grid.rows; row += 1) {
    const centerY = getLaneCenter(row);
    const bayX = towerX + 8;
    const bayY = centerY - 31;

    ctx.fillStyle = "#6d4727";
    ctx.beginPath();
    ctx.moveTo(bayX + 8, bayY + 4);
    ctx.lineTo(bayX + 50, bayY + 4);
    ctx.lineTo(bayX + 60, bayY + 14);
    ctx.lineTo(bayX + 60, bayY + 50);
    ctx.lineTo(bayX, bayY + 50);
    ctx.lineTo(bayX, bayY + 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8f6238";
    ctx.beginPath();
    ctx.moveTo(bayX + 4, bayY + 2);
    ctx.lineTo(bayX + 46, bayY + 2);
    ctx.lineTo(bayX + 56, bayY + 12);
    ctx.lineTo(bayX + 56, bayY + 46);
    ctx.lineTo(bayX + 4, bayY + 46);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(56, 35, 19, 0.45)";
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 223, 172, 0.14)";
    for (let plank = 0; plank < 4; plank += 1) {
      ctx.beginPath();
      ctx.moveTo(bayX + 8, bayY + 10 + plank * 9);
      ctx.lineTo(bayX + 50, bayY + 10 + plank * 9);
      ctx.stroke();
    }
  }
}

function drawFence(ctx) {
  const seamX = game.grid.left - 10;
  ctx.fillStyle = "#7f6137";
  ctx.fillRect(seamX, game.grid.top - 4, 10, game.grid.height + 8);
  ctx.fillStyle = "rgba(255, 231, 185, 0.16)";
  ctx.fillRect(seamX + 2, game.grid.top - 2, 2, game.grid.height + 4);
}

function drawRightHedge(ctx) {
  const hedgeX = game.grid.left + game.grid.width + 18;
  const hedgeWidth = Math.max(110, game.canvas.width - hedgeX + 10);
  ctx.fillStyle = "#2b6e24";
  ctx.fillRect(hedgeX, game.grid.top - 18, hedgeWidth, game.grid.height + 36);
  for (let row = 0; row < game.grid.rows + 1; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const x = hedgeX + col * 30 + (row % 2) * 14;
      const y = game.grid.top - 10 + row * 58;
      ctx.fillStyle = row % 2 === 0 ? "#387f2e" : "#2f7528";
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.arc(x + 18, y + 4, 20, 0, Math.PI * 2);
      ctx.arc(x + 8, y - 12, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFlowerScatter(ctx) {
  for (let row = 0; row < game.grid.rows; row += 1) {
    for (let index = 0; index < 7; index += 1) {
      const x = game.grid.left + 32 + index * 92 + (row % 2) * 18;
      const y = game.grid.top + row * game.cellHeight + 18 + (index % 3) * 18;
      ctx.fillStyle = index % 2 === 0 ? "rgba(255, 129, 129, 0.72)" : "rgba(255, 240, 120, 0.7)";
      ctx.beginPath();
      ctx.arc(x, y, 2.8, 0, Math.PI * 2);
      ctx.arc(x + 4, y + 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGrassBorder(ctx) {
  ctx.fillStyle = "rgba(51, 109, 29, 0.35)";
  for (let x = game.grid.left - 24; x < game.grid.left + game.grid.width + 22; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, game.grid.top + game.grid.height + 4);
    ctx.lineTo(x + 4, game.grid.top + game.grid.height - 10);
    ctx.lineTo(x + 8, game.grid.top + game.grid.height + 4);
    ctx.fill();
  }
}

function drawGrid(ctx) {
  for (let row = 0; row < game.grid.rows; row += 1) {
    const warning = game.laneWarnings[row];
    if (warning > 0.68) {
      ctx.fillStyle = `rgba(225, 77, 58, ${Math.min(0.24, warning * 0.18)})`;
      ctx.fillRect(game.grid.left, game.grid.top + row * game.cellHeight, game.grid.width, game.cellHeight);
    }
    for (let col = 0; col < game.grid.cols; col += 1) {
      const cell = getCellRect(col, row);
      const laneGradient = ctx.createLinearGradient(cell.x, cell.y, cell.x, cell.y + cell.height);
      laneGradient.addColorStop(0, (row + col) % 2 === 0 ? "#98dc63" : "#87ca52");
      laneGradient.addColorStop(1, (row + col) % 2 === 0 ? "#5f9838" : "#568c32");
      ctx.fillStyle = laneGradient;
      ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
      ctx.strokeStyle = "rgba(255,255,255,0.09)";
      ctx.lineWidth = 2;
      ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
      ctx.strokeStyle = "rgba(41, 89, 20, 0.18)";
      for (let stripe = 1; stripe < 4; stripe += 1) {
        ctx.beginPath();
        ctx.moveTo(cell.x + 6, cell.y + stripe * (cell.height / 4));
        ctx.lineTo(cell.x + cell.width - 6, cell.y + stripe * (cell.height / 4));
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = "#d2bf91";
  ctx.fillRect(game.grid.left - 26, game.grid.top, 18, game.grid.height);
  ctx.fillRect(game.grid.left + game.grid.width + 8, game.grid.top, 12, game.grid.height);
}

function drawMowers(ctx) {
  game.mowers.forEach((mower) => {
    if (!mower.active) return;
    ctx.save();
    ctx.translate(mower.x - 4, mower.y + 6);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c6372d";
    ctx.beginPath();
    ctx.roundRect(-18, -4, 34, 18, 6);
    ctx.fill();

    ctx.fillStyle = "#5e646e";
    ctx.fillRect(-4, -10, 8, 10);
    ctx.strokeStyle = "#343941";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, -10);
    ctx.lineTo(18, -18);
    ctx.stroke();

    ctx.fillStyle = "#edf3f7";
    ctx.fillRect(12, -20, 7, 4);

    ctx.save();
    ctx.translate(-8, 9);
    ctx.rotate(mower.spin);
    ctx.fillStyle = "#d7e0e7";
    for (let blade = 0; blade < 4; blade += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(-1.5, -9, 3, 18);
    }
    ctx.restore();

    ctx.fillStyle = "#22262b";
    ctx.beginPath();
    ctx.arc(-11, 15, 5.5, 0, Math.PI * 2);
    ctx.arc(9, 15, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawPreview(ctx) {
  const cell = getHoveredCell();
  if (!cell || game.state !== "running") return;
  const existingPlant = getPlantAt(cell.col, cell.row);
  const config = game.plantConfigs[game.selectedPlant];
  const canPlace = !existingPlant && game.sun >= config.cost;
  const rect = getCellRect(cell.col, cell.row);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = canPlace ? "#f5ffe4" : "#e14d3a";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

function drawPlants(ctx) { game.plants.forEach((plant) => plant.draw(ctx, game)); }
function drawProjectiles(ctx) { game.projectiles.forEach((projectile) => projectile.draw(ctx)); }
function drawEnemies(ctx) { [...game.enemies].sort((a, b) => a.y - b.y).forEach((enemy) => enemy.draw(ctx)); }
function drawSuns(ctx) { game.suns.forEach((sun) => sun.draw(ctx, game.totalTime)); }

function drawParticles(ctx) {
  game.particles.forEach((particle) => {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    if (particle.kind === "blood") {
      ctx.beginPath();
      ctx.ellipse(0, 0, particle.size, particle.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (particle.kind === "arm") {
      ctx.fillRect(-particle.size * 0.55, -particle.size * 0.18, particle.size * 1.1, particle.size * 0.36);
      ctx.beginPath();
      ctx.arc(particle.size * 0.55, 0, particle.size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (particle.kind === "head") {
      ctx.beginPath();
      ctx.ellipse(0, 0, particle.size * 0.7, particle.size * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (particle.kind === "chunk") {
      ctx.beginPath();
      ctx.moveTo(-particle.size * 0.6, -particle.size * 0.2);
      ctx.lineTo(particle.size * 0.5, -particle.size * 0.45);
      ctx.lineTo(particle.size * 0.65, particle.size * 0.4);
      ctx.lineTo(-particle.size * 0.45, particle.size * 0.55);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-particle.size * 0.4, -particle.size * 0.4, particle.size, particle.size * 0.6);
    }
    ctx.restore();
  });
}

function drawLaneLabels(ctx) {
  ctx.save();

  for (let row = 0; row < game.grid.rows; row += 1) {
    const centerY = getLaneCenter(row);
    const signX = game.grid.left - 132;
    const signY = centerY - 12;

    ctx.fillStyle = "#a48354";
    ctx.beginPath();
    ctx.roundRect(signX, signY, 58, 24, 6);
    ctx.fill();
    ctx.strokeStyle = "#5b3d21";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#2f2214";
    ctx.font = "bold 13px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(`Lane ${row + 1}`, signX + 29, centerY + 4);
  }

  const boardWidth = 210;
  const boardHeight = 56;
  const boardX = game.grid.left + game.grid.width - boardWidth - 6;
  const boardY = game.grid.top - 68;

  ctx.fillStyle = "#775130";
  ctx.beginPath();
  ctx.roundRect(boardX, boardY, boardWidth, boardHeight, 9);
  ctx.fill();
  ctx.strokeStyle = "#4f341c";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#2b2419";
  ctx.beginPath();
  ctx.roundRect(boardX + 12, boardY + 8, 94, 24, 6);
  ctx.fill();

  const minutes = String(Math.floor(game.totalTime / 60)).padStart(2, "0");
  const seconds = String(Math.floor(game.totalTime % 60)).padStart(2, "0");
  const tenths = String(Math.floor((game.totalTime % 1) * 10));

  ctx.fillStyle = "#d6a95b";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${minutes}:${seconds}:${tenths}`, boardX + 20, boardY + 26);

  ctx.fillStyle = "#f3e2bc";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Wave Timer", boardX + 156, boardY + 25);

  ctx.font = "bold 16px Trebuchet MS";
  ctx.fillText(`Next wave in ${Math.ceil(game.waveTimer)}s`, boardX + boardWidth / 2, boardY + 47);

  if (game.scareTimer > 0) {
    ctx.fillStyle = "#fff6de";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.textAlign = "left";
    ctx.fillText("Crow Call Active", game.grid.left, game.grid.top - 26);
  }

  ctx.restore();
}

function handleKeyDown(event) {
  game.keys[event.key.toLowerCase()] = true;
  if (event.key === "Escape") {
    if (game.state === "running") pauseGame();
    else if (game.state === "paused") resumeGame();
  }
  if (event.key.toLowerCase() === "m") toggleMute();
  if (event.key.toLowerCase() === "c" && game.state === "running" && !event.repeat) {
    spawnSun(game.mouse.x || game.grid.left + 100, game.mouse.y || game.grid.top, 25, false);
    game.playSound("sun-create");
    setTip("Bonus sun dropped near your cursor.");
  }
}

function handleKeyUp(event) { game.keys[event.key.toLowerCase()] = false; }

function handleKeyPress(event) {
  const key = event.key.toLowerCase();
  if (key === "1") selectPlant("peashooter");
  if (key === "2") selectPlant("sunflower");
  if (key === "3") selectPlant("wallnut");
  if (key === "r" && game.state === "gameover") restartGame();
}

function handleBlur() { if (game.state === "running") pauseGame(); }
function handleFocus() { updateHud(); }
function handleVisibilityChange() { if (document.visibilityState === "hidden" && game.state === "running") pauseGame(); }
function handleMouseMove(event) { const rect = game.canvas.getBoundingClientRect(); game.mouse.x = event.clientX - rect.left; game.mouse.y = event.clientY - rect.top; }

function handleMouseDown(event) {
  game.mouse.down = true;
  if (event.button === 1) {
    game.scareTimer = 1.8;
    game.playSound("crow");
    setTip("Crow Call triggered. Weak zombies will panic and retreat.");
  }
}

function handleMouseUp() { game.mouse.down = false; }
function handleCanvasClick() { if (game.state === "running") { const cell = getHoveredCell(); if (cell) placePlant(cell.col, cell.row); } }
function handleContextMenu(event) {
  event.preventDefault();
  if (game.state !== "running") return;
  const cell = getHoveredCell();
  if (!cell) return;
  const index = game.plants.findIndex((plant) => plant.col === cell.col && plant.row === cell.row);
  if (index >= 0) {
    const removedPlant = game.plants.splice(index, 1)[0];
    game.sun += Math.floor(removedPlant.cost * 0.5);
    game.score += 10;
    game.playSound("dig");
    setTip(`${removedPlant.name} removed. Half the sun cost was refunded.`);
    updateHud();
  }
}

function handleWheel(event) {
  event.preventDefault();
  const options = Object.keys(game.plantConfigs);
  const currentIndex = options.indexOf(game.selectedPlant);
  const direction = event.deltaY > 0 ? 1 : -1;
  const nextIndex = (currentIndex + direction + options.length) % options.length;
  selectPlant(options[nextIndex]);
  const zoomDelta = event.deltaY < 0 ? 0.02 : -0.02;
  game.zoom = Math.min(1.12, Math.max(0.92, game.zoom + zoomDelta));
  resizeCanvas();
  updateHud();
}

function placePlant(col, row) {
  if (getPlantAt(col, row)) return setTip("That tile is already occupied.");
  const config = game.plantConfigs[game.selectedPlant];
  if (game.sun < config.cost) {
    game.playSound("deny");
    return setTip(`Not enough sun for ${config.name}.`);
  }
  game.sun -= config.cost;
  game.plants.push(new Plant(col, row, config));
  game.score += 12;
  game.playSound("plant");
  setTip(`${config.name} deployed in lane ${row + 1}.`);
  updateHud();
}

function spawnEnemy() {
  const lane = Math.floor(Math.random() * game.grid.rows);
  game.enemies.push(new Enemy(lane, game.level, game.canvas.width));
  game.playSound("spawn");
}

function spawnSun(x, y, value, drifting) { game.suns.push(new SunToken(x, y, value, drifting)); }

function collectSun(sun, autoCollect = false) {
  if (!sun.active) return;
  sun.active = false;
  game.sun += sun.value;
  game.score += 8;
  game.playSound("collect");
  setTip(autoCollect ? `Sun auto-collected. Reserve now at ${game.sun}.` : `Sun collected. Reserve now at ${game.sun}.`);
  updateHud();
}

function selectPlant(type) {
  game.selectedPlant = type;
  const config = game.plantConfigs[type];
  game.dom.seedButtons.forEach((button) => button.classList.toggle("active", button.dataset.seed === type));
  if (config) setTip(`${config.name}: ${config.description}`);
}

function toggleMute() { game.isMuted = !game.isMuted; game.dom.muteButton.textContent = game.isMuted ? "Sound: Off" : "Sound: On"; }
function setTip(text) { if (game.dom.tipLine) game.dom.tipLine.textContent = text; }
function showOverlay(name) { Object.entries(game.dom.overlays).forEach(([key, overlay]) => overlay.classList.toggle("visible", key === name)); }

function updateHud() {
  game.dom.healthValue.textContent = `${game.baseHealth}%`;
  game.dom.sunValue.textContent = String(game.sun);
  game.dom.scoreValue.textContent = String(game.score);
  game.dom.levelValue.textContent = String(game.level);
  game.dom.waveValue.textContent = String(game.wave);
  game.dom.zoomValue.textContent = `${game.zoom.toFixed(2)}x`;
  game.dom.statusValue.textContent = game.state.charAt(0).toUpperCase() + game.state.slice(1);
  game.dom.seedButtons.forEach((button) => {
    const config = game.plantConfigs[button.dataset.seed];
    button.classList.toggle("disabled", game.sun < config.cost);
  });
}

function getHoveredCell() {
  const withinX = game.mouse.x >= game.grid.left && game.mouse.x <= game.grid.left + game.grid.width;
  const withinY = game.mouse.y >= game.grid.top && game.mouse.y <= game.grid.top + game.grid.height;
  if (!withinX || !withinY) return null;
  return { col: Math.floor((game.mouse.x - game.grid.left) / game.cellWidth), row: Math.floor((game.mouse.y - game.grid.top) / game.cellHeight) };
}

function getCellRect(col, row) { return { x: game.grid.left + col * game.cellWidth, y: game.grid.top + row * game.cellHeight, width: game.cellWidth, height: game.cellHeight }; }
function getLaneCenter(row) { return game.grid.top + row * game.cellHeight + game.cellHeight / 2; }
function getPlantAt(col, row) { return game.plants.find((plant) => plant.col === col && plant.row === row) || null; }

function hasZombieAhead(row, col) {
  return game.enemies.some((enemy) => !enemy.fsm.matches("DEAD") && enemy.lane === row && enemy.x > game.grid.left + col * game.cellWidth);
}

function findPlantAhead(enemy) {
  const candidates = game.plants.filter((plant) => plant.row === enemy.lane).sort((a, b) => b.col - a.col);
  return candidates.find((plant) => {
    const bounds = plant.getBounds(game);
    const distance = enemy.x - (bounds.x + bounds.width);
    return distance >= -8 && distance <= game.cellWidth * 1.25;
  }) || null;
}

function findProjectileTarget(projectile) {
  return game.enemies.find((enemy) => {
    if (enemy.fsm.matches("DEAD") || enemy.lane !== projectile.lane) return false;
    return Math.abs(enemy.x - projectile.x) < enemy.width * 0.5;
  }) || null;
}

function advanceWave() {
  game.wave += 1;
  game.level = 1 + Math.floor((game.wave - 1) / 2);
  game.score += 50;
  game.waveTimer = game.waveDuration;
  game.currentWaveSize = 3 + game.wave * 2 + Math.floor(game.level * 1.5);
  game.zombiesSpawnedThisWave = 0;
  game.nextSpawnDelay = Math.max(0.45, 1.35 - game.level * 0.06);
  game.spawnClock = 0.35;
  document.dispatchEvent(new CustomEvent("levelUp", { detail: { level: game.level, wave: game.wave } }));
  updateHud();
}

function ensureAudio() {
  if (game.isMuted) return null;
  if (!game.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    game.audioContext = new AudioContextClass();
  }
  if (game.audioContext.state === "suspended") game.audioContext.resume();
  if (!game.noiseBuffer) {
    const buffer = game.audioContext.createBuffer(1, game.audioContext.sampleRate, game.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    game.noiseBuffer = buffer;
  }
  return game.audioContext;
}

function tone(ctx, start, frequency, duration, type, gainAmount, glide = 1) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * glide), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainAmount, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function noiseBurst(ctx, start, duration, gainAmount, lowpass = 1600) {
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = game.noiseBuffer;
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainAmount, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + 0.03);
}

function playSound(name) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  switch (name) {
    case "shoot": tone(ctx, now, 540, 0.06, "square", 0.05, 1.1); tone(ctx, now + 0.015, 820, 0.05, "triangle", 0.025, 0.85); break;
    case "impact": tone(ctx, now, 210, 0.05, "triangle", 0.04, 0.7); noiseBurst(ctx, now, 0.05, 0.012, 1200); break;
    case "mower": noiseBurst(ctx, now, 0.18, 0.03, 900); tone(ctx, now, 130, 0.18, "sawtooth", 0.04, 0.92); tone(ctx, now + 0.04, 98, 0.22, "sawtooth", 0.035, 0.88); break;
    case "sun-create": tone(ctx, now, 680, 0.08, "sine", 0.035, 1.3); tone(ctx, now + 0.04, 980, 0.08, "sine", 0.03, 0.9); break;
    case "sun-drift": tone(ctx, now, 430, 0.05, "sine", 0.015, 1.15); break;
    case "collect": tone(ctx, now, 760, 0.08, "sine", 0.035, 1.18); tone(ctx, now + 0.03, 1040, 0.1, "triangle", 0.02, 0.95); break;
    case "plant": tone(ctx, now, 300, 0.08, "triangle", 0.03, 1.12); tone(ctx, now + 0.04, 420, 0.08, "sine", 0.022, 0.95); noiseBurst(ctx, now, 0.04, 0.008, 900); break;
    case "dig": noiseBurst(ctx, now, 0.05, 0.012, 700); tone(ctx, now, 180, 0.06, "sawtooth", 0.02, 0.7); break;
    case "bite": noiseBurst(ctx, now, 0.06, 0.013, 900); tone(ctx, now, 160, 0.05, "square", 0.018, 0.82); break;
    case "death": tone(ctx, now, 190, 0.18, "triangle", 0.035, 0.55); noiseBurst(ctx, now + 0.02, 0.08, 0.014, 600); break;
    case "spawn": tone(ctx, now, 140, 0.08, "sawtooth", 0.02, 1.08); break;
    case "wave": tone(ctx, now, 520, 0.12, "triangle", 0.03, 1.2); tone(ctx, now + 0.08, 740, 0.12, "triangle", 0.03, 1.15); tone(ctx, now + 0.16, 940, 0.16, "sine", 0.025, 0.95); break;
    case "crow": tone(ctx, now, 300, 0.06, "square", 0.03, 0.8); tone(ctx, now + 0.05, 220, 0.08, "square", 0.025, 0.75); break;
    case "deny": tone(ctx, now, 130, 0.08, "sawtooth", 0.02, 0.7); break;
    case "breach": tone(ctx, now, 120, 0.18, "sawtooth", 0.05, 0.5); noiseBurst(ctx, now, 0.08, 0.02, 500); break;
    case "start": tone(ctx, now, 420, 0.08, "triangle", 0.028, 1.15); tone(ctx, now + 0.07, 620, 0.12, "sine", 0.026, 1.05); break;
    case "pause": tone(ctx, now, 280, 0.07, "triangle", 0.02, 0.86); break;
    case "fail": tone(ctx, now, 260, 0.2, "triangle", 0.03, 0.62); tone(ctx, now + 0.12, 180, 0.22, "sawtooth", 0.025, 0.58); break;
    case "victory": tone(ctx, now, 520, 0.12, "triangle", 0.03, 1.18); tone(ctx, now + 0.1, 760, 0.14, "triangle", 0.028, 1.12); tone(ctx, now + 0.2, 1040, 0.18, "sine", 0.026, 0.96); break;
    default: tone(ctx, now, 440, 0.06, "sine", 0.02, 1); break;
  }
}

game.getCellRect = getCellRect;
game.getLaneCenter = getLaneCenter;
game.hasZombieAhead = hasZombieAhead;
game.findPlantAhead = findPlantAhead;
game.findProjectileTarget = findProjectileTarget;
game.spawnSun = spawnSun;
game.playSound = playSound;
game.spawnBlood = spawnBlood;
game.spawnZombieParts = spawnZombieParts;

window.addEventListener("load", setup);







