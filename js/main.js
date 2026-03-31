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
  clickPulse: 0,
  textures: {},
  spawnIntervalId: null, sunIntervalId: null, waveIntervalId: null, animationFrameId: 0,
  isMuted: false, listenersBound: false, dom: {}
};

let difficulty = "normal";

const DIFFICULTY_SETTINGS = {
  easy: {
    zombieSpeed: 0.5,
    spawnRate: 3000,
    zombieHealth: 50
  },
  normal: {
    zombieSpeed: 1,
    spawnRate: 2000,
    zombieHealth: 100
  },
  hard: {
    zombieSpeed: 1.5,
    spawnRate: 1200,
    zombieHealth: 150
  }
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
    howToButton: document.getElementById("howToButton"),
    howToBackButton: document.getElementById("howToBackButton"),
    resumeButton: document.getElementById("resumeButton"),
    pauseRestartButton: document.getElementById("pauseRestartButton"),
    restartButton: document.getElementById("restartButton"),
    muteButton: document.getElementById("muteButton"),
    pauseMuteButton: document.getElementById("pauseMuteButton"),
    controlsCard: document.getElementById("controlsCard"),
    pauseControlsSlot: document.getElementById("pauseControlsSlot"),
    entityLayer: document.getElementById("entityLayer"),
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
    menuMainView: document.getElementById("menuMainView"),
    menuHowToView: document.getElementById("menuHowToView"),
    difficultyButtons: Array.from(document.querySelectorAll(".difficulty-button")),
    seedButtons: Array.from(document.querySelectorAll(".seed-button"))
  };
}

function bindUi() {
  attachControlsToPauseMenu();
  game.dom.playButton.addEventListener("click", startGame);
  if (game.dom.howToButton) game.dom.howToButton.addEventListener("click", () => setMenuView("howto"));
  if (game.dom.howToBackButton) game.dom.howToBackButton.addEventListener("click", () => setMenuView("main"));
  game.dom.difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => setDifficulty(button.dataset.difficulty));
  });
  game.dom.resumeButton.addEventListener("click", resumeGame);
  if (game.dom.pauseRestartButton) game.dom.pauseRestartButton.addEventListener("click", returnToMenu);
  game.dom.restartButton.addEventListener("click", restartGame);
  if (game.dom.muteButton) game.dom.muteButton.addEventListener("click", toggleMute);
  if (game.dom.pauseMuteButton) game.dom.pauseMuteButton.addEventListener("click", toggleMute);
  game.dom.seedButtons.forEach((button) => button.addEventListener("click", () => selectPlant(button.dataset.seed)));

  document.addEventListener("gameStart", () => {
    game.state = "running";
    setMenuView("main");
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
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const clamp = (min, value, max) => Math.min(max, Math.max(min, value));

  const uiScale = clamp(0.8, Math.min(viewportWidth / 1480, viewportHeight / 930), 1.08);
  document.documentElement.style.setProperty("--ui-scale", uiScale.toFixed(3));

  game.canvas.width = viewportWidth;
  game.canvas.height = viewportHeight;

  const hud = document.getElementById("hud");
  const sidebar = document.getElementById("sidebar");
  const hudRect = hud ? hud.getBoundingClientRect() : { height: viewportHeight * 0.1 };
  const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : { width: 0 };

  const leftPadding = clamp(viewportWidth * 0.045, viewportWidth * 0.085, viewportWidth * 0.16);
  const topPadding = clamp(viewportHeight * 0.13, hudRect.height + viewportHeight * 0.045, viewportHeight * 0.28);
  const sidebarReserve = viewportWidth > 980 ? sidebarRect.width + viewportWidth * 0.03 : viewportWidth * 0.03;

  game.grid.left = leftPadding;
  game.grid.top = topPadding;

  const availableWidth = Math.max(viewportWidth * 0.45, viewportWidth - game.grid.left - sidebarReserve);
  const availableHeight = Math.max(viewportHeight * 0.42, viewportHeight - game.grid.top - viewportHeight * 0.08);

  const boardRatio = game.grid.cols / game.grid.rows;
  const fittedWidth = Math.min(availableWidth, availableHeight * boardRatio);
  const zoomedWidth = Math.min(availableWidth, fittedWidth * game.zoom);
  const minBoardWidth = viewportWidth * 0.34;

  game.grid.width = clamp(minBoardWidth, zoomedWidth, availableWidth);
  game.grid.height = game.grid.width / boardRatio;

  if (game.grid.top + game.grid.height > viewportHeight - viewportHeight * 0.04) {
    game.grid.height = viewportHeight - game.grid.top - viewportHeight * 0.04;
    game.grid.width = game.grid.height * boardRatio;
  }

  game.cellWidth = game.grid.width / game.grid.cols;
  game.cellHeight = game.grid.height / game.grid.rows;
  alignLaneMowers();
  draw();
}

function createMower(row) {
  return { row, x: game.grid.left - 42, y: getLaneCenter(row), active: true, triggered: false, speed: 0, width: 62, height: 34, spin: 0, sparkTimer: 0 };
}

function alignLaneMowers() {
  game.mowers.forEach((mower, row) => {
    mower.row = row;
    mower.y = getLaneCenter(row);
    if (!mower.triggered) mower.x = game.grid.left - 42;
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
  game.nextSpawnDelay = getSpawnDelaySeconds();
  game.spawnClock = game.nextSpawnDelay;
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
function returnToMenu() {
  stopTimers();
  game.state = "menu";
  setMenuView("main");
  showOverlay("menu");
  updateHud();
}
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
  game.clickPulse = Math.max(0, game.clickPulse - deltaTime * 4.8);
  game.laneWarnings = game.laneWarnings.map(() => 0);
  game.waveTimer = Math.max(0, game.waveTimer - deltaTime);
  game.spawnClock -= deltaTime;

  if (game.zombiesSpawnedThisWave < game.currentWaveSize && game.spawnClock <= 0) {
    spawnEnemy();
    game.zombiesSpawnedThisWave += 1;
    game.nextSpawnDelay = getSpawnDelaySeconds();
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
  drawProjectiles(ctx);
  drawParticles(ctx);
  drawSuns(ctx);
  drawLaneLabels(ctx);
  ctx.restore();
  renderDomEntities();
}

function getTexturePattern(name, builder) {
  if (!game.textures[name]) {
    game.textures[name] = builder();
  }
  return game.textures[name];
}

function buildGrassPattern() {
  const tile = document.createElement("canvas");
  tile.width = 80;
  tile.height = 80;
  const pctx = tile.getContext("2d");

  const base = pctx.createLinearGradient(0, 0, 0, tile.height);
  base.addColorStop(0, "#85c04d");
  base.addColorStop(1, "#4d812d");
  pctx.fillStyle = base;
  pctx.fillRect(0, 0, tile.width, tile.height);

  for (let row = 0; row < 18; row += 1) {
    const y = row * 5 + Math.random() * 3;
    pctx.strokeStyle = `rgba(173, 226, 109, ${0.08 + Math.random() * 0.12})`;
    pctx.lineWidth = 1 + Math.random() * 1.2;
    pctx.beginPath();
    pctx.moveTo(0, y);
    pctx.lineTo(tile.width, y + (Math.random() - 0.5) * 4);
    pctx.stroke();
  }

  for (let dot = 0; dot < 90; dot += 1) {
    const x = Math.random() * tile.width;
    const y = Math.random() * tile.height;
    pctx.fillStyle = Math.random() > 0.5 ? "rgba(241, 255, 198, 0.12)" : "rgba(31, 74, 17, 0.1)";
    pctx.beginPath();
    pctx.arc(x, y, 0.8 + Math.random() * 1.6, 0, Math.PI * 2);
    pctx.fill();
  }

  return game.ctx.createPattern(tile, "repeat");
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

  const sunOverlay = ctx.createRadialGradient(
    game.grid.left + game.grid.width * 0.78,
    game.grid.top + game.grid.height * 0.15,
    game.grid.width * 0.08,
    game.grid.left + game.grid.width * 0.78,
    game.grid.top + game.grid.height * 0.15,
    game.grid.width * 0.95
  );
  sunOverlay.addColorStop(0, "rgba(255, 241, 168, 0.18)");
  sunOverlay.addColorStop(1, "rgba(255, 241, 168, 0)");
  ctx.fillStyle = sunOverlay;
  ctx.fillRect(game.grid.left - 90, game.grid.top - 80, game.grid.width + 180, game.grid.height + 160);
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
  const towerX = game.grid.left - 102;
  const towerY = game.grid.top - 8;
  const towerWidth = 82;
  const towerHeight = game.grid.height + 38;
  const brickColors = ["#8a5e3c", "#a87d54", "#6f4930", "#b38960"];
  const brickW = 20;
  const brickH = 18;

  ctx.fillStyle = "#4d311c";
  ctx.fillRect(towerX - 4, towerY - 5, towerWidth + 8, towerHeight + 10);

  for (let row = 0; row < Math.ceil(towerHeight / brickH); row += 1) {
    for (let col = 0; col < Math.ceil(towerWidth / brickW) + 1; col += 1) {
      const x = towerX + col * brickW - (row % 2) * 10;
      const y = towerY + row * brickH;
      ctx.fillStyle = brickColors[(row + col) % brickColors.length];
      ctx.fillRect(x, y, brickW - 2, brickH - 2);
    }
  }

  ctx.strokeStyle = "rgba(55, 34, 19, 0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(towerX, towerY, towerWidth, towerHeight);

  const houseX = towerX - 74;
  const houseY = game.grid.top + game.cellHeight * 0.98;
  const houseW = 74;
  const houseH = 96;

  ctx.fillStyle = "#ead6aa";
  ctx.fillRect(houseX, houseY, houseW, houseH);
  ctx.strokeStyle = "#5b3d21";
  ctx.lineWidth = 2;
  ctx.strokeRect(houseX, houseY, houseW, houseH);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(houseX + 4, houseY + 4, houseW - 8, 6);

  ctx.fillStyle = "#7f5331";
  ctx.beginPath();
  ctx.moveTo(houseX - 8, houseY + 10);
  ctx.lineTo(houseX + houseW / 2, houseY - 26);
  ctx.lineTo(houseX + houseW + 10, houseY + 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 224, 170, 0.22)";
  for (let tile = 0; tile < 8; tile += 1) {
    ctx.beginPath();
    ctx.moveTo(houseX + 2 + tile * 10, houseY + 2);
    ctx.lineTo(houseX + 14 + tile * 10, houseY + 13);
    ctx.stroke();
  }

  ctx.fillStyle = "#f4e9cf";
  ctx.fillRect(houseX + 4, houseY + 58, 6, 32);

  ctx.fillStyle = "#abd0e7";
  ctx.fillRect(houseX + 12, houseY + 26, 14, 18);
  ctx.fillRect(houseX + 48, houseY + 26, 14, 18);
  ctx.strokeStyle = "#4f341c";
  ctx.strokeRect(houseX + 12, houseY + 26, 14, 18);
  ctx.strokeRect(houseX + 48, houseY + 26, 14, 18);
  ctx.beginPath();
  ctx.moveTo(houseX + 19, houseY + 26);
  ctx.lineTo(houseX + 19, houseY + 44);
  ctx.moveTo(houseX + 12, houseY + 35);
  ctx.lineTo(houseX + 26, houseY + 35);
  ctx.moveTo(houseX + 55, houseY + 26);
  ctx.lineTo(houseX + 55, houseY + 44);
  ctx.moveTo(houseX + 48, houseY + 35);
  ctx.lineTo(houseX + 62, houseY + 35);
  ctx.stroke();

  ctx.fillStyle = "#674222";
  ctx.fillRect(houseX + 29, houseY + 52, 16, 44);
  ctx.strokeRect(houseX + 29, houseY + 52, 16, 44);
  ctx.fillStyle = "#d7b26c";
  ctx.beginPath();
  ctx.arc(houseX + 41, houseY + 75, 1.7, 0, Math.PI * 2);
  ctx.fill();

  const baseY = game.grid.top + game.grid.height;

  ctx.fillStyle = "#cdb88f";
  ctx.beginPath();
  ctx.moveTo(houseX - 8, baseY + 30);
  ctx.lineTo(towerX + 18, baseY + 10);
  ctx.lineTo(towerX + 18, baseY + 46);
  ctx.lineTo(houseX - 8, baseY + 46);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e6d5b1";
  ctx.beginPath();
  ctx.moveTo(houseX - 18, baseY + 36);
  ctx.lineTo(houseX + 4, baseY + 20);
  ctx.lineTo(houseX + 4, baseY + 52);
  ctx.lineTo(houseX - 18, baseY + 56);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(92, 61, 32, 0.16)";
  ctx.fillRect(houseX - 2, baseY + 8, towerX - houseX + 20, 5);

  for (let row = 0; row < game.grid.rows; row += 1) {
    const centerY = getLaneCenter(row);
    const bayX = towerX + 10;
    const bayY = centerY - 28;

    ctx.fillStyle = "#6d4727";
    ctx.beginPath();
    ctx.moveTo(bayX + 6, bayY + 4);
    ctx.lineTo(bayX + 40, bayY + 4);
    ctx.lineTo(bayX + 50, bayY + 14);
    ctx.lineTo(bayX + 50, bayY + 46);
    ctx.lineTo(bayX, bayY + 46);
    ctx.lineTo(bayX, bayY + 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8f6238";
    ctx.beginPath();
    ctx.moveTo(bayX + 2, bayY + 2);
    ctx.lineTo(bayX + 36, bayY + 2);
    ctx.lineTo(bayX + 46, bayY + 12);
    ctx.lineTo(bayX + 46, bayY + 42);
    ctx.lineTo(bayX + 2, bayY + 42);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(56, 35, 19, 0.45)";
    ctx.stroke();
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
  const grassPattern = getTexturePattern("grass", buildGrassPattern);
  for (let row = 0; row < game.grid.rows; row += 1) {
    const warning = game.laneWarnings[row];
    if (warning > 0.68) {
      ctx.fillStyle = `rgba(225, 77, 58, ${Math.min(0.24, warning * 0.18)})`;
      ctx.fillRect(game.grid.left, game.grid.top + row * game.cellHeight, game.grid.width, game.cellHeight);
    }
    for (let col = 0; col < game.grid.cols; col += 1) {
      const cell = getCellRect(col, row);
      const laneGradient = ctx.createLinearGradient(cell.x, cell.y, cell.x, cell.y + cell.height);
      laneGradient.addColorStop(0, (row + col) % 2 === 0 ? "#8ed057" : "#79b848");
      laneGradient.addColorStop(1, (row + col) % 2 === 0 ? "#4f8330" : "#466f2a");
      ctx.fillStyle = laneGradient;
      ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

      if (grassPattern) {
        ctx.save();
        ctx.globalAlpha = 0.26;
        ctx.fillStyle = grassPattern;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        ctx.restore();
      }

      ctx.fillStyle = (row + col) % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
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

      ctx.save();
      ctx.strokeStyle = "rgba(20, 45, 18, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cell.x + 0.8, cell.y + 0.8, cell.width - 1.6, cell.height - 1.6);
      ctx.restore();
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
    ctx.translate(mower.x - 4, mower.y + 3);
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
  const pulse = 0.6 + Math.sin(game.totalTime * 9) * 0.4;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = canPlace ? "#f5ffe4" : "#e14d3a";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = canPlace ? `rgba(206, 255, 154, ${0.55 + pulse * 0.2})` : `rgba(255, 120, 120, ${0.5 + pulse * 0.24})`;
  ctx.lineWidth = 2.5 + pulse;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4);

  if (game.clickPulse > 0.01) {
    const glow = ctx.createRadialGradient(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width * 0.08,
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width * 0.62 + game.clickPulse * 18
    );
    glow.addColorStop(0, `rgba(250, 255, 214, ${game.clickPulse * 0.22})`);
    glow.addColorStop(1, "rgba(250, 255, 214, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(rect.x - 16, rect.y - 16, rect.width + 32, rect.height + 32);
  }
  ctx.restore();
}

function drawPlants(ctx) { game.plants.forEach((plant) => plant.draw(ctx, game)); }
function drawProjectiles(ctx) { game.projectiles.forEach((projectile) => projectile.draw(ctx)); }
function drawEnemies(ctx) { [...game.enemies].sort((a, b) => a.y - b.y).forEach((enemy) => enemy.draw(ctx)); }
function drawSuns(ctx) { game.suns.forEach((sun) => sun.draw(ctx, game.totalTime)); }

function renderDomEntities() {
  const layer = game.dom.entityLayer;
  if (!layer) return;

  const active = new Set();

  game.plants.forEach((plant) => {
    const id = `plant-${plant.id}`;
    active.add(id);
    upsertEntitySprite(id, "plant", getPlantFrame(plant));
  });

  game.enemies.forEach((enemy) => {
    if (enemy.removed || enemy.fsm.matches("DEAD")) return;
    const id = `zombie-${enemy.id}`;
    active.add(id);
    upsertEntitySprite(id, "zombie", getZombieFrame(enemy));
  });

  Array.from(layer.children).forEach((node) => {
    if (!active.has(node.dataset.entityId)) node.remove();
  });
}

function upsertEntitySprite(id, type, frame) {
  const layer = game.dom.entityLayer;
  let node = layer.querySelector(`[data-entity-id="${id}"]`);
  if (!node) {
    node = document.createElement("div");
    node.className = `entity-sprite ${type}`;
    node.dataset.entityId = id;
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    node.appendChild(img);
    layer.appendChild(node);
  }

  const img = node.firstElementChild;
  if (img && img.src !== frame.src) img.src = frame.src;

  node.style.width = `${frame.width}px`;
  node.style.height = `${frame.height}px`;
  node.style.transform = `translate3d(${frame.x}px, ${frame.y}px, 0) rotate(${frame.rotate ?? 0}deg) scale(${frame.scale ?? 1})`;
  node.style.zIndex = String(frame.zIndex ?? 1);
  node.classList.toggle("is-hit", Boolean(frame.hit));
  if (type === "zombie" && img) {
    img.style.setProperty("--bob-duration", `${frame.bobDuration ?? 0.62}s`);
    img.style.setProperty("--bob-y", `${frame.bobY ?? -3}px`);
    img.style.setProperty("--bob-rot", `${frame.bobRotate ?? 0.8}deg`);
    img.style.setProperty("--bob-scale", String(frame.bobScale ?? 1.01));
  }
}

function getPlantFrame(plant) {
  const cell = getCellRect(plant.col, plant.row);
  const width = Math.min(cell.width, cell.height) * 0.96;
  const height = cell.height;
  return {
    src: `assets/${plant.type}.png`,
    x: cell.x + (cell.width - width) * 0.5,
    y: cell.y,
    width,
    height,
    zIndex: 200 + plant.row
  };
}

function getZombieFrame(enemy) {
  const width = game.cellWidth * 0.92;
  const height = game.cellHeight;
  const bottomY = enemy.renderY + game.cellHeight * 0.5 + (enemy.visualOffsetY || 0);
  return {
    src: "assets/zombie.png",
    x: enemy.renderX - width * 0.5 + (enemy.visualOffsetX || 0),
    y: bottomY - height,
    width,
    height,
    hit: enemy.hitFlash > 0.02,
    zIndex: 300 + enemy.lane,
    rotate: enemy.visualRotate || 0,
    scale: enemy.visualScale || 1,
    bobDuration: enemy.bobDuration || 0.62,
    bobY: -(2.1 + enemy.bobAmplitude * 0.55),
    bobRotate: 0.45 + enemy.tiltAmplitude * 0.35,
    bobScale: 1.004 + enemy.bobAmplitude * 0.002
  };
}

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
    const signX = game.grid.left - 138;
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
function handleCanvasClick() {
  if (game.state !== "running") return;
  const cell = getHoveredCell();
  if (!cell) return;
  game.clickPulse = 1;
  placePlant(cell.col, cell.row);
}
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
  game.enemies.push(new Enemy(lane, game.level, game.canvas.width, getDifficultySettings()));
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

function attachControlsToPauseMenu() {
  if (!game.dom.controlsCard || !game.dom.pauseControlsSlot) return;
  if (game.dom.controlsCard.parentElement !== game.dom.pauseControlsSlot) {
    game.dom.pauseControlsSlot.appendChild(game.dom.controlsCard);
  }
}

function setMenuView(view) {
  const showHowTo = view === "howto";
  if (game.dom.menuMainView) game.dom.menuMainView.classList.toggle("is-hidden", showHowTo);
  if (game.dom.menuHowToView) game.dom.menuHowToView.classList.toggle("is-hidden", !showHowTo);
}

function setDifficulty(nextDifficulty) {
  if (!DIFFICULTY_SETTINGS[nextDifficulty]) return;
  difficulty = nextDifficulty;
  game.dom.difficultyButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.difficulty === difficulty);
  });
}

function toggleMute() {
  game.isMuted = !game.isMuted;
  const label = game.isMuted ? "Sound: Off" : "Sound: On";
  if (game.dom.muteButton) game.dom.muteButton.textContent = label;
  if (game.dom.pauseMuteButton) game.dom.pauseMuteButton.textContent = label;
}
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
  game.nextSpawnDelay = getSpawnDelaySeconds();
  game.spawnClock = Math.max(0.2, game.nextSpawnDelay * 0.55);
  document.dispatchEvent(new CustomEvent("levelUp", { detail: { level: game.level, wave: game.wave } }));
  updateHud();
}

function getDifficultySettings() {
  return DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.normal;
}

function getSpawnDelaySeconds() {
  const settings = getDifficultySettings();
  const baseSeconds = settings.spawnRate / 1000;
  const waveFactor = Math.max(0.45, 1 - (game.wave - 1) * 0.05);
  return Math.max(0.25, baseSeconds * waveFactor * (0.88 + Math.random() * 0.24));
}

const SOUND_LIBRARY = {
  plant: null,
  shoot: { src: ["assets/sounds/plant.mp3", "assets/sounds/plant2.mp3"], volume: 0.3 },
  impact: null,
  bite: { src: "assets/sounds/chompsoft.mp3", volume: 0.28 },
  death: { src: "assets/sounds/zombie-falling.mp3", volume: 0.42 },
  collect: { src: "assets/sounds/moneyfalls.mp3", volume: 0.36 },
  mower: { src: "assets/sounds/lawnmower.mp3", volume: 0.5 },
  "sun-create": null,
  "sun-drift": null,
  spawn: null,
  wave: null,
  start: null,
  pause: null,
  victory: null,
  fail: null,
  breach: { src: "assets/sounds/lawnmower.mp3", volume: 0.34 },
  crow: null,
  dig: null,
  deny: null,
  lawnmower: { src: "assets/sounds/lawnmower.mp3", volume: 0.5 },
  moneyfalls: null
};

function playSound(name) {
  if (game.isMuted) return;
  const sound = SOUND_LIBRARY[name];
  if (!sound) return;
  const source = Array.isArray(sound.src)
    ? sound.src[Math.floor(Math.random() * sound.src.length)]
    : sound.src;
  const audio = new Audio(source);
  audio.preload = "auto";
  audio.volume = Math.min(0.5, Math.max(0.2, sound.volume));
  audio.play().catch(() => {});
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























