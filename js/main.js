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
      reloadTime: 1.05,
      damage: 20,
      color: "#65b646",
      highlight: "#8ce667",
      description: "Fast ranged pressure with reliable pea fire."
    },
    sunflower: {
      type: "sunflower",
      name: "Sunflower",
      cost: 50,
      maxHealth: 90,
      sunInterval: 6.6,
      color: "#f6b940",
      highlight: "#845834",
      description: "Build economy and keep your sun reserve healthy."
    },
    wallnut: {
      type: "wallnut",
      name: "Wallnut",
      cost: 75,
      maxHealth: 460,
      color: "#a86d3a",
      highlight: "#2c2118",
      description: "Soaks heavy lane pressure and protects shooters."
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
  screenShake: 0,
  laneWarnings: [0, 0, 0, 0, 0],
  waveTimer: 19,
  waveDuration: 19,
  currentWaveSize: 3,
  zombiesSpawnedThisWave: 0,
  nextSpawnDelay: 1.4,
  spawnClock: 1.4,
  spawnIntervalId: null,
  sunIntervalId: null,
  waveIntervalId: null,
  animationFrameId: 0,
  audioContext: null,
  noiseBuffer: null,
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
    tipLine: document.getElementById("tipLine"),
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
    game.dom.gameOverText.textContent = win
      ? "The garden held the line and the season is saved."
      : "The zombies broke the defense before the garden could recover.";
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

  const sidebarWidth = window.innerWidth > 980 ? 310 : 0;
  game.grid.left = Math.max(58, window.innerWidth * 0.09);
  game.grid.top = Math.max(124, window.innerHeight * 0.18);
  game.grid.width = Math.min(window.innerWidth - game.grid.left - Math.max(28, sidebarWidth), 980) * game.zoom;
  game.grid.height = Math.min(window.innerHeight - game.grid.top - 82, 530) * game.zoom;
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
  game.screenShake = 0;
  game.laneWarnings = [0, 0, 0, 0, 0];
  game.waveTimer = game.waveDuration;
  game.currentWaveSize = 3;
  game.zombiesSpawnedThisWave = 0;
  game.nextSpawnDelay = 1.4;
  game.spawnClock = 1.4;
  selectPlant("peashooter");
  setTip("Build a balanced defense: economy first, then damage, then blockers.");
  updateHud();
}

function startGame() {
  resetRun();
  startTimers();
  document.dispatchEvent(new CustomEvent("gameStart"));
  game.playSound("start");
}

function resumeGame() {
  if (game.state !== "paused") {
    return;
  }
  game.state = "running";
  showOverlay(null);
  game.playSound("start");
  updateHud();
}

function pauseGame() {
  if (game.state !== "running") {
    return;
  }
  game.state = "paused";
  showOverlay("pause");
  game.playSound("pause");
  updateHud();
}

function restartGame() {
  showOverlay(null);
  startGame();
}

function endGame(win) {
  game.playSound(win ? "victory" : "fail");
  document.dispatchEvent(new CustomEvent("gameOver", { detail: { win } }));
}

function startTimers() {
  stopTimers();

  game.sunIntervalId = window.setInterval(() => {
    if (game.state === "running") {
      spawnSun(
        game.grid.left + 80 + Math.random() * (game.grid.width - 160),
        game.grid.top - 36,
        25,
        true
      );
      game.playSound("sun-drift");
    }
  }, 5200);

  game.waveIntervalId = window.setInterval(() => {
    if (game.state === "running") {
      advanceWave();
    }
  }, game.waveDuration * 1000);
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

    if (!enemy.fsm.matches("DEAD") && enemy.x < game.grid.left - 18) {
      game.baseHealth = Math.max(0, game.baseHealth - 18);
      enemy.removed = true;
      game.screenShake = 0.22;
      game.playSound("breach");
      setTip(`Lane ${enemy.lane + 1} was breached. Reinforce weak lanes earlier.`);
      if (game.baseHealth <= 0) {
        endGame(false);
      }
    }
  });
  game.suns.forEach((sun) => {
    sun.update(deltaTime);
    if (sun.active && sun.isNear(game.mouse.x, game.mouse.y)) {
      collectSun(sun, true);
    }
  });

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

  ctx.save();
  if (game.screenShake > 0) {
    const amount = game.screenShake * 7;
    ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
  }

  drawBackground(ctx);
  drawGrid(ctx);
  drawPreview(ctx);
  drawPlants(ctx);
  drawProjectiles(ctx);
  drawEnemies(ctx);
  drawSuns(ctx);
  drawLaneLabels(ctx);
  ctx.restore();
}

function drawBackground(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, game.canvas.height);
  sky.addColorStop(0, "#b7e3ff");
  sky.addColorStop(0.38, "#dff4bf");
  sky.addColorStop(0.76, "#80bf53");
  sky.addColorStop(1, "#699446");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.arc(160, 90, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9dd28d";
  ctx.beginPath();
  ctx.moveTo(0, game.grid.top + 24);
  ctx.quadraticCurveTo(180, game.grid.top - 90, 360, game.grid.top + 18);
  ctx.quadraticCurveTo(560, game.grid.top + 94, 780, game.grid.top + 10);
  ctx.quadraticCurveTo(980, game.grid.top - 72, game.canvas.width, game.grid.top + 28);
  ctx.lineTo(game.canvas.width, game.grid.top + 150);
  ctx.lineTo(0, game.grid.top + 150);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#83b06c";
  ctx.beginPath();
  ctx.moveTo(0, game.grid.top + 70);
  ctx.quadraticCurveTo(220, game.grid.top - 10, 440, game.grid.top + 64);
  ctx.quadraticCurveTo(650, game.grid.top + 118, 880, game.grid.top + 44);
  ctx.quadraticCurveTo(1080, game.grid.top - 8, game.canvas.width, game.grid.top + 78);
  ctx.lineTo(game.canvas.width, game.grid.top + 170);
  ctx.lineTo(0, game.grid.top + 170);
  ctx.closePath();
  ctx.fill();

  drawHouse(ctx);
  drawFence(ctx);
}

function drawHouse(ctx) {
  const houseX = game.grid.left - 112;
  const houseY = game.grid.top + game.grid.height * 0.38;

  ctx.fillStyle = "#f2d7a0";
  ctx.fillRect(houseX, houseY - 66, 72, 66);
  ctx.fillStyle = "#9b4e27";
  ctx.beginPath();
  ctx.moveTo(houseX - 6, houseY - 66);
  ctx.lineTo(houseX + 36, houseY - 102);
  ctx.lineTo(houseX + 78, houseY - 66);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6e4022";
  ctx.fillRect(houseX + 26, houseY - 28, 18, 28);
  ctx.fillStyle = "#9ec7ef";
  ctx.fillRect(houseX + 9, houseY - 50, 16, 16);
  ctx.fillRect(houseX + 47, houseY - 50, 16, 16);
}

function drawFence(ctx) {
  const startX = game.grid.left - 34;
  for (let row = 0; row < game.grid.rows; row += 1) {
    const y = getLaneCenter(row) + game.cellHeight * 0.24;
    ctx.fillStyle = "#936035";
    for (let index = 0; index < 4; index += 1) {
      ctx.fillRect(startX + index * 8, y - 22, 4, 28);
    }
    ctx.fillRect(startX - 2, y - 16, 34, 4);
    ctx.fillRect(startX - 2, y - 4, 34, 4);
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
      laneGradient.addColorStop(0, (row + col) % 2 === 0 ? "#96d963" : "#86c952");
      laneGradient.addColorStop(1, (row + col) % 2 === 0 ? "#6ca53f" : "#629a38");
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
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = canPlace ? "#f5ffe4" : "#e14d3a";
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
  ctx.fillStyle = "rgba(18, 17, 14, 0.72)";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "left";

  for (let row = 0; row < game.grid.rows; row += 1) {
    ctx.fillText(`Lane ${row + 1}`, 22, getLaneCenter(row) + 5);
  }

  if (game.scareTimer > 0) {
    ctx.fillStyle = "#fff6de";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.fillText("Crow Call Active", game.grid.left, game.grid.top - 22);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(22, 20, 15, 0.82)";
  ctx.font = "bold 16px Trebuchet MS";
  ctx.fillText(`Next wave in ${Math.ceil(game.waveTimer)}s`, game.grid.left + game.grid.width, game.grid.top - 18);
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
    game.playSound("sun-create");
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
    game.playSound("crow");
    setTip("Crow Call triggered. Weak zombies will panic and retreat.");
  }
}

function handleMouseUp() {
  game.mouse.down = false;
}

function handleCanvasClick() {
  if (game.state !== "running") {
    return;
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
  if (getPlantAt(col, row)) {
    setTip("That tile is already occupied.");
    return;
  }

  const config = game.plantConfigs[game.selectedPlant];
  if (game.sun < config.cost) {
    game.playSound("deny");
    setTip(`Not enough sun for ${config.name}.`);
    return;
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

function spawnSun(x, y, value, drifting) {
  game.suns.push(new SunToken(x, y, value, drifting));
}

function collectSun(sun, autoCollect = false) {
  if (!sun.active) {
    return;
  }
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

  game.dom.seedButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.seed === type);
  });

  if (config) {
    setTip(`${config.name}: ${config.description}`);
  }
}

function toggleMute() {
  game.isMuted = !game.isMuted;
  game.dom.muteButton.textContent = game.isMuted ? "Sound: Off" : "Sound: On";
}

function setTip(text) {
  if (game.dom.tipLine) {
    game.dom.tipLine.textContent = text;
  }
}

function showOverlay(name) {
  Object.entries(game.dom.overlays).forEach(([key, overlay]) => {
    overlay.classList.toggle("visible", key === name);
  });
}

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
  if (game.isMuted) {
    return null;
  }

  if (!game.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    game.audioContext = new AudioContextClass();
  }

  if (game.audioContext.state === "suspended") {
    game.audioContext.resume();
  }

  if (!game.noiseBuffer) {
    const buffer = game.audioContext.createBuffer(1, game.audioContext.sampleRate, game.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
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
  if (!ctx) {
    return;
  }

  const now = ctx.currentTime;

  switch (name) {
    case "shoot":
      tone(ctx, now, 540, 0.06, "square", 0.05, 1.1);
      tone(ctx, now + 0.015, 820, 0.05, "triangle", 0.025, 0.85);
      break;
    case "impact":
      tone(ctx, now, 210, 0.05, "triangle", 0.04, 0.7);
      noiseBurst(ctx, now, 0.05, 0.012, 1200);
      break;
    case "sun-create":
      tone(ctx, now, 680, 0.08, "sine", 0.035, 1.3);
      tone(ctx, now + 0.04, 980, 0.08, "sine", 0.03, 0.9);
      break;
    case "sun-drift":
      tone(ctx, now, 430, 0.05, "sine", 0.015, 1.15);
      break;
    case "collect":
      tone(ctx, now, 760, 0.08, "sine", 0.035, 1.18);
      tone(ctx, now + 0.03, 1040, 0.1, "triangle", 0.02, 0.95);
      break;
    case "plant":
      tone(ctx, now, 300, 0.08, "triangle", 0.03, 1.12);
      tone(ctx, now + 0.04, 420, 0.08, "sine", 0.022, 0.95);
      noiseBurst(ctx, now, 0.04, 0.008, 900);
      break;
    case "dig":
      noiseBurst(ctx, now, 0.05, 0.012, 700);
      tone(ctx, now, 180, 0.06, "sawtooth", 0.02, 0.7);
      break;
    case "bite":
      noiseBurst(ctx, now, 0.06, 0.013, 900);
      tone(ctx, now, 160, 0.05, "square", 0.018, 0.82);
      break;
    case "death":
      tone(ctx, now, 190, 0.18, "triangle", 0.035, 0.55);
      noiseBurst(ctx, now + 0.02, 0.08, 0.014, 600);
      break;
    case "spawn":
      tone(ctx, now, 140, 0.08, "sawtooth", 0.02, 1.08);
      break;
    case "wave":
      tone(ctx, now, 520, 0.12, "triangle", 0.03, 1.2);
      tone(ctx, now + 0.08, 740, 0.12, "triangle", 0.03, 1.15);
      tone(ctx, now + 0.16, 940, 0.16, "sine", 0.025, 0.95);
      break;
    case "crow":
      tone(ctx, now, 300, 0.06, "square", 0.03, 0.8);
      tone(ctx, now + 0.05, 220, 0.08, "square", 0.025, 0.75);
      break;
    case "deny":
      tone(ctx, now, 130, 0.08, "sawtooth", 0.02, 0.7);
      break;
    case "breach":
      tone(ctx, now, 120, 0.18, "sawtooth", 0.05, 0.5);
      noiseBurst(ctx, now, 0.08, 0.02, 500);
      break;
    case "start":
      tone(ctx, now, 420, 0.08, "triangle", 0.028, 1.15);
      tone(ctx, now + 0.07, 620, 0.12, "sine", 0.026, 1.05);
      break;
    case "pause":
      tone(ctx, now, 280, 0.07, "triangle", 0.02, 0.86);
      break;
    case "fail":
      tone(ctx, now, 260, 0.2, "triangle", 0.03, 0.62);
      tone(ctx, now + 0.12, 180, 0.22, "sawtooth", 0.025, 0.58);
      break;
    case "victory":
      tone(ctx, now, 520, 0.12, "triangle", 0.03, 1.18);
      tone(ctx, now + 0.1, 760, 0.14, "triangle", 0.028, 1.12);
      tone(ctx, now + 0.2, 1040, 0.18, "sine", 0.026, 0.96);
      break;
    default:
      tone(ctx, now, 440, 0.06, "sine", 0.02, 1);
      break;
  }
}

game.getCellRect = getCellRect;
game.getLaneCenter = getLaneCenter;
game.hasZombieAhead = hasZombieAhead;
game.findPlantAhead = findPlantAhead;
game.findProjectileTarget = findProjectileTarget;
game.spawnSun = spawnSun;
game.playSound = playSound;

window.addEventListener("load", setup);
