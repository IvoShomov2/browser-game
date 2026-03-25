const game = {
  canvas: null,
  ctx: null,
  grid: {
    cols: 8,
    rows: 5,
    left: 120,
    top: 130,
    width: 0,
    height: 0
  },
  cellWidth: 0,
  cellHeight: 0,
  plantConfigs: {
    peashooter: {
      type: "peashooter",
      name: "Peashooter",
      cost: 100,
      maxHealth: 110,
      reloadTime: 1.1,
      damage: 20,
      color: "#65b646",
      highlight: "#8ce667"
    },
    sunflower: {
      type: "sunflower",
      name: "Sunflower",
      cost: 50,
      maxHealth: 85,
      sunInterval: 7,
      color: "#f6b940",
      highlight: "#845834"
    },
    wallnut: {
      type: "wallnut",
      name: "Wallnut",
      cost: 75,
      maxHealth: 420,
      color: "#a86d3a",
      highlight: "#2c2118"
    }
  },
  selectedPlant: "peashooter",
  plants: [],
  projectiles: [],
  enemies: [],
  suns: [],
  mouse: { x: 0, y: 0, down: false },
  keys: {},
  state: "menu",
  baseHealth: 100,
  sun: 150,
  score: 0,
  level: 1,
  wave: 1,
  zoom: 1,
  totalTime: 0,
  lastTime: 0,
  scareTimer: 0,
  zombiesDefeated: 0,
  spawnIntervalId: null,
  sunIntervalId: null,
  waveIntervalId: null,
  animationFrameId: 0,
  audioContext: null,
  isMuted: false,
  listenersBound: false,
  dom: {}
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
    overlays: {
      menu: document.getElementById("menuOverlay"),
      pause: document.getElementById("pauseOverlay"),
      gameOver: document.getElementById("gameOverOverlay")
    },
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
    seedButtons: Array.from(document.querySelectorAll(".seed-button"))
  };
}

function bindUi() {
  game.dom.playButton.addEventListener("click", startGame);
  game.dom.resumeButton.addEventListener("click", resumeGame);
  game.dom.restartButton.addEventListener("click", restartGame);
  game.dom.muteButton.addEventListener("click", toggleMute);

  game.dom.seedButtons.forEach((button) => {
    button.addEventListener("click", () => selectPlant(button.dataset.seed));
  });

  document.addEventListener("gameStart", () => {
    game.state = "running";
    showOverlay(null);
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
    game.dom.gameOverText.textContent = win
      ? "The garden held the line and the season is saved."
      : "The zombies reached the house before the defense could recover.";
    updateHud();
  });

  document.addEventListener("levelUp", () => {
    game.playSound(880, 0.08, "triangle");
  });
}

function bindEvents() {
  if (game.listenersBound) {
    return;
  }

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

  const sidebarWidth = window.innerWidth > 980 ? 280 : 0;
  game.grid.left = Math.max(42, window.innerWidth * 0.08);
  game.grid.top = Math.max(120, window.innerHeight * 0.18);
  game.grid.width = Math.min(window.innerWidth - game.grid.left - Math.max(28, sidebarWidth), 980) * game.zoom;
  game.grid.height = Math.min(window.innerHeight - game.grid.top - 70, 520) * game.zoom;
  game.cellWidth = game.grid.width / game.grid.cols;
  game.cellHeight = game.grid.height / game.grid.rows;
  draw();
}

function resetRun() {
  game.plants = [];
  game.projectiles = [];
  game.enemies = [];
  game.suns = [];
  game.baseHealth = 100;
  game.sun = 150;
  game.score = 0;
  game.level = 1;
  game.wave = 1;
  game.totalTime = 0;
  game.scareTimer = 0;
  game.zombiesDefeated = 0;
  game.lastTime = 0;
  selectPlant("peashooter");
  updateHud();
}

function startGame() {
  resetRun();
  startTimers();
  document.dispatchEvent(new CustomEvent("gameStart"));
  game.playSound(660, 0.08, "square");
}

function resumeGame() {
  if (game.state !== "paused") {
    return;
  }
  game.state = "running";
  showOverlay(null);
  updateHud();
}

function pauseGame() {
  if (game.state !== "running") {
    return;
  }
  game.state = "paused";
  showOverlay("pause");
  updateHud();
}

function restartGame() {
  showOverlay(null);
  startGame();
}

function endGame(win) {
  document.dispatchEvent(new CustomEvent("gameOver", { detail: { win } }));
}

function startTimers() {
  stopTimers();

  game.spawnIntervalId = window.setInterval(() => {
    if (game.state === "running") {
      spawnEnemy();
    }
  }, Math.max(1200, 3600 - game.level * 180));

  game.sunIntervalId = window.setInterval(() => {
    if (game.state === "running") {
      spawnSun(
        game.grid.left + 80 + Math.random() * (game.grid.width - 160),
        game.grid.top - 26,
        25,
        true
      );
    }
  }, 5500);

  game.waveIntervalId = window.setInterval(() => {
    if (game.state === "running") {
      game.wave += 1;
      game.level = 1 + Math.floor((game.wave - 1) / 2);
      game.score += 50;
      document.dispatchEvent(new CustomEvent("levelUp", { detail: { level: game.level, wave: game.wave } }));
      updateHud();
    }
  }, 20000);
}

function stopTimers() {
  window.clearInterval(game.spawnIntervalId);
  window.clearInterval(game.sunIntervalId);
  window.clearInterval(game.waveIntervalId);
}

function loop(timestamp) {
  if (!game.lastTime) {
    game.lastTime = timestamp;
  }

  const deltaTime = Math.min((timestamp - game.lastTime) / 1000, 0.033);
  game.lastTime = timestamp;

  if (game.state === "running") {
    update(deltaTime);
  }

  draw();
  game.animationFrameId = requestAnimationFrame(loop);
}

function update(deltaTime) {
  game.totalTime += deltaTime;
  game.scareTimer = Math.max(0, game.scareTimer - deltaTime);

  game.plants.forEach((plant) => plant.update(game, deltaTime));
  game.projectiles.forEach((projectile) => projectile.update(game, deltaTime));
  game.enemies.forEach((enemy) => {
    enemy.update(game, deltaTime);
    if (!enemy.fsm.matches("DEAD") && enemy.x < game.grid.left - 18) {
      game.baseHealth = Math.max(0, game.baseHealth - 18);
      enemy.removed = true;
      game.playSound(120, 0.08, "sawtooth");
      if (game.baseHealth <= 0) {
        endGame(false);
      }
    }
  });
  game.suns.forEach((sun) => sun.update(deltaTime));

  game.plants = game.plants.filter((plant) => !plant.isDead());
  game.projectiles = game.projectiles.filter((projectile) => projectile.active);
  game.enemies = game.enemies.filter((enemy) => !enemy.removed);
  game.suns = game.suns.filter((sun) => sun.active);

  if (game.wave >= 8 && game.zombiesDefeated >= 26 && game.state === "running") {
    endGame(true);
  }

  updateHud();
}

function draw() {
  const ctx = game.ctx;
  ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
  drawBackground(ctx);
  drawGrid(ctx);
  drawPreview(ctx);
  drawPlants(ctx);
  drawProjectiles(ctx);
  drawEnemies(ctx);
  drawSuns(ctx);
  drawLaneLabels(ctx);
}

function drawBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, game.canvas.height);
  gradient.addColorStop(0, "#d4ecff");
  gradient.addColorStop(0.35, "#b9e08a");
  gradient.addColorStop(1, "#8dbe55");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

  ctx.fillStyle = "#f6efc9";
  ctx.fillRect(0, game.grid.top - 54, game.canvas.width, 44);

  ctx.fillStyle = "#bf9b56";
  ctx.fillRect(0, game.grid.top + game.grid.height, game.canvas.width, game.canvas.height - game.grid.top - game.grid.height);
}

function drawGrid(ctx) {
  for (let row = 0; row < game.grid.rows; row += 1) {
    for (let col = 0; col < game.grid.cols; col += 1) {
      const cell = getCellRect(col, row);
      ctx.fillStyle = (row + col) % 2 === 0 ? "#8bc657" : "#7bb84c";
      ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2;
      ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
    }
  }

  ctx.fillStyle = "#d4b580";
  ctx.fillRect(game.grid.left - 26, game.grid.top, 18, game.grid.height);
}

function drawPreview(ctx) {
  const cell = getHoveredCell();
  if (!cell || game.state !== "running") {
    return;
  }

  const existingPlant = getPlantAt(cell.col, cell.row);
  const config = game.plantConfigs[game.selectedPlant];
  const canPlace = !existingPlant && game.sun >= config.cost;
  const rect = getCellRect(cell.col, cell.row);

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = canPlace ? "#fff6de" : "#bf3d2e";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

function drawPlants(ctx) {
  game.plants.forEach((plant) => plant.draw(ctx, game));
}

function drawProjectiles(ctx) {
  game.projectiles.forEach((projectile) => projectile.draw(ctx));
}

function drawEnemies(ctx) {
  [...game.enemies].sort((a, b) => a.y - b.y).forEach((enemy) => enemy.draw(ctx));
}

function drawSuns(ctx) {
  game.suns.forEach((sun) => sun.draw(ctx, game.totalTime));
}

function drawLaneLabels(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(31, 28, 22, 0.75)";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "left";

  for (let row = 0; row < game.grid.rows; row += 1) {
    ctx.fillText(`Lane ${row + 1}`, 18, getLaneCenter(row) + 5);
  }

  if (game.scareTimer > 0) {
    ctx.fillStyle = "#fff6de";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.fillText("Crow Call Active", game.grid.left, game.grid.top - 22);
  }

  ctx.restore();
}

function handleKeyDown(event) {
  game.keys[event.key.toLowerCase()] = true;

  if (event.key === "Escape") {
    if (game.state === "running") {
      pauseGame();
    } else if (game.state === "paused") {
      resumeGame();
    }
  }

  if (event.key.toLowerCase() === "m") {
    toggleMute();
  }
}

function handleKeyUp(event) {
  game.keys[event.key.toLowerCase()] = false;
}

function handleKeyPress(event) {
  const key = event.key.toLowerCase();

  if (key === "1") {
    selectPlant("peashooter");
  }
  if (key === "2") {
    selectPlant("sunflower");
  }
  if (key === "3") {
    selectPlant("wallnut");
  }
  if (key === "c" && game.state === "running") {
    spawnSun(game.mouse.x || game.grid.left + 100, game.mouse.y || game.grid.top, 25, false);
  }
  if (key === "r" && game.state === "gameover") {
    restartGame();
  }
}

function handleBlur() {
  if (game.state === "running") {
    pauseGame();
  }
}

function handleFocus() {
  updateHud();
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden" && game.state === "running") {
    pauseGame();
  }
}

function handleMouseMove(event) {
  const rect = game.canvas.getBoundingClientRect();
  game.mouse.x = event.clientX - rect.left;
  game.mouse.y = event.clientY - rect.top;
}

function handleMouseDown(event) {
  game.mouse.down = true;
  if (event.button === 1) {
    game.scareTimer = 1.8;
    game.playSound(250, 0.07, "triangle");
  }
}

function handleMouseUp() {
  game.mouse.down = false;
}

function handleCanvasClick() {
  if (game.state !== "running") {
    return;
  }

  for (const sun of game.suns) {
    if (sun.containsPoint(game.mouse.x, game.mouse.y)) {
      collectSun(sun);
      return;
    }
  }

  const cell = getHoveredCell();
  if (!cell) {
    return;
  }

  placePlant(cell.col, cell.row);
}

function handleContextMenu(event) {
  event.preventDefault();

  if (game.state !== "running") {
    return;
  }

  const cell = getHoveredCell();
  if (!cell) {
    return;
  }

  const index = game.plants.findIndex((plant) => plant.col === cell.col && plant.row === cell.row);
  if (index >= 0) {
    const removedPlant = game.plants.splice(index, 1)[0];
    game.sun += Math.floor(removedPlant.cost * 0.5);
    game.score += 10;
    game.playSound(180, 0.04, "square");
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
  if (getPlantAt(col, row)) {
    return;
  }

  const config = game.plantConfigs[game.selectedPlant];
  if (game.sun < config.cost) {
    game.playSound(110, 0.06, "sawtooth");
    return;
  }

  game.sun -= config.cost;
  game.plants.push(new Plant(col, row, config));
  game.score += 12;
  game.playSound(420, 0.05, "square");
  updateHud();
}

function spawnEnemy() {
  const lane = Math.floor(Math.random() * game.grid.rows);
  game.enemies.push(new Enemy(lane, game.level, game.canvas.width));
}

function spawnSun(x, y, value, drifting) {
  game.suns.push(new SunToken(x, y, value, drifting));
}

function collectSun(sun) {
  sun.active = false;
  game.sun += sun.value;
  game.score += 8;
  game.playSound(780, 0.05, "sine");
  updateHud();
}

function selectPlant(type) {
  game.selectedPlant = type;
  game.dom.seedButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.seed === type);
  });
}

function toggleMute() {
  game.isMuted = !game.isMuted;
  game.dom.muteButton.textContent = game.isMuted ? "Sound: Off" : "Sound: On";
}

function showOverlay(name) {
  Object.entries(game.dom.overlays).forEach(([key, overlay]) => {
    overlay.classList.toggle("visible", key === name);
  });
}

function updateHud() {
  game.dom.healthValue.textContent = String(game.baseHealth);
  game.dom.sunValue.textContent = String(game.sun);
  game.dom.scoreValue.textContent = String(game.score);
  game.dom.levelValue.textContent = String(game.level);
  game.dom.waveValue.textContent = String(game.wave);
  game.dom.zoomValue.textContent = `${game.zoom.toFixed(2)}x`;
  game.dom.statusValue.textContent = game.state.charAt(0).toUpperCase() + game.state.slice(1);
}

function getHoveredCell() {
  const withinX = game.mouse.x >= game.grid.left && game.mouse.x <= game.grid.left + game.grid.width;
  const withinY = game.mouse.y >= game.grid.top && game.mouse.y <= game.grid.top + game.grid.height;

  if (!withinX || !withinY) {
    return null;
  }

  return {
    col: Math.floor((game.mouse.x - game.grid.left) / game.cellWidth),
    row: Math.floor((game.mouse.y - game.grid.top) / game.cellHeight)
  };
}

function getCellRect(col, row) {
  return {
    x: game.grid.left + col * game.cellWidth,
    y: game.grid.top + row * game.cellHeight,
    width: game.cellWidth,
    height: game.cellHeight
  };
}

function getLaneCenter(row) {
  return game.grid.top + row * game.cellHeight + game.cellHeight / 2;
}

function getPlantAt(col, row) {
  return game.plants.find((plant) => plant.col === col && plant.row === row) || null;
}

function hasZombieAhead(row, col) {
  return game.enemies.some(
    (enemy) => !enemy.fsm.matches("DEAD") && enemy.lane === row && enemy.x > game.grid.left + col * game.cellWidth
  );
}

function findPlantAhead(enemy) {
  const candidates = game.plants
    .filter((plant) => plant.row === enemy.lane)
    .sort((a, b) => b.col - a.col);

  return candidates.find((plant) => {
    const bounds = plant.getBounds(game);
    const distance = enemy.x - (bounds.x + bounds.width);
    return distance >= -8 && distance <= game.cellWidth * 1.25;
  }) || null;
}

function findProjectileTarget(projectile) {
  return game.enemies.find((enemy) => {
    if (enemy.fsm.matches("DEAD") || enemy.lane !== projectile.lane) {
      return false;
    }
    return Math.abs(enemy.x - projectile.x) < enemy.width * 0.5;
  }) || null;
}

function playSound(frequency, duration, type) {
  if (game.isMuted) {
    return;
  }

  if (!game.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    game.audioContext = new AudioContextClass();
  }

  if (game.audioContext.state === "suspended") {
    game.audioContext.resume();
  }

  const oscillator = game.audioContext.createOscillator();
  const gain = game.audioContext.createGain();

  oscillator.type = type || "sine";
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, game.audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, game.audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, game.audioContext.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(game.audioContext.destination);
  oscillator.start();
  oscillator.stop(game.audioContext.currentTime + duration + 0.02);
}

game.getCellRect = getCellRect;
game.getLaneCenter = getLaneCenter;
game.hasZombieAhead = hasZombieAhead;
game.findPlantAhead = findPlantAhead;
game.findProjectileTarget = findProjectileTarget;
game.spawnSun = spawnSun;
game.playSound = playSound;

window.addEventListener("load", setup);
