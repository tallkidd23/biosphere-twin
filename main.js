// =====================================================================
// DECENTRALIZED BIOSPHERE DIGITAL TWIN (DBDT) v0.1 — Core Physics Engine
// Soil Hydrology + Infiltration ODE + Mycelial Transport + Root Dynamics
// =====================================================================

// ---------- Grid Configuration ----------
const WIDTH = 52;
const HEIGHT = 36;
const CELL_SIZE = 14;

const TICK_MS = 80;
const DAY_TICKS = 240;

// ---------- State Fields ----------
let moistureField = createField(0.35); // Volumetric water content [0.0 - 1.0]
let organicCarbonField = createField(2.5); // % Soil Organic Matter (SOM)
let rootDensityField = createField(0.0); // Root biomass density
let myceliumField = createField(0.0); // Hyphal network connectivity

let day = 1;
let tick = 0;
let activeTool = "taproot";
let scopeOpen = false;

// Micro-climate atmospheric states
const CLIMATES = [
  { name: "Temperate Infiltration", icon: "⛅", precip: 1.2, vpd: 0.85, desc: "Gentle soaking rain; optimal capillary recharge." },
  { name: "Atmospheric River (Flood)", icon: "🌧️", precip: 5.5, vpd: 0.25, desc: "High precipitation; risk of saturation runoff without swales." },
  { name: "Solar Heat Dome (Drought)", icon: "☀️", precip: 0.0, vpd: 2.40, desc: "High vapor pressure deficit; roots rely on deep taproot moisture." },
  { name: "Cool Dew Equilibrium", icon: "🌱", precip: 0.4, vpd: 0.50, desc: "Low evapotranspiration; active mycorrhizal nutrient trade." }
];
let currentClimateIdx = 0;
let climateTicksLeft = 400;

// Timeseries History
const MAX_POINTS = 160;
let history = [];

function createField(val = 0.0) {
  return Array.from({ length: WIDTH }, () => Array(HEIGHT).fill(val));
}

function getNeighbors(x, y) {
  const n = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + WIDTH) % WIDTH;
      const ny = Math.max(0, Math.min(HEIGHT - 1, y + dy));
      n.push([nx, ny]);
    }
  }
  return n;
}

// ---------- Hydrology & Biological ODE Step ----------
function stepSimulation() {
  tick++;
  climateTicksLeft--;

  if (climateTicksLeft <= 0) {
    currentClimateIdx = (currentClimateIdx + 1) % CLIMATES.length;
    climateTicksLeft = 350 + Math.floor(Math.random() * 200);
    const c = CLIMATES[currentClimateIdx];
    logLine(`🌍 Atmospheric Transition: Entered '${c.name}' ${c.icon} — ${c.desc}`, "day");
    updateTelemetryHUD();
  }

  const climate = CLIMATES[currentClimateIdx];

  // 1. Surface Infiltration (top row y=0)
  for (let x = 0; x < WIDTH; x++) {
    const som = organicCarbonField[x][0];
    const infiltrationCapacity = 0.015 + (som * 0.005);
    const addedMoisture = Math.min(climate.precip * 0.01, infiltrationCapacity);
    moistureField[x][0] = Math.min(1.0, moistureField[x][0] + addedMoisture);
  }

  // 2. Vertical Percolation & Lateral Capillary Diffusion
  const nextMoisture = createField(0.0);
  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      let m = moistureField[x][y];

      // Gravity percolation downwards
      if (y < HEIGHT - 1) {
        const flowDown = m * 0.035;
        m -= flowDown;
        nextMoisture[x][y + 1] += flowDown;
      }

      // Root extraction & transpiration based on atmospheric VPD
      const roots = rootDensityField[x][y];
      if (roots > 0.05) {
        const transRate = roots * climate.vpd * 0.003;
        m = Math.max(0.05, m - transRate);
      }

      nextMoisture[x][y] += m;
    }
  }

  // Cap and write back
  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      moistureField[x][y] = Math.min(1.0, Math.max(0.0, nextMoisture[x][y]));

      // Root growth in moist, carbon-rich zones
      if (rootDensityField[x][y] > 0.02) {
        if (moistureField[x][y] > 0.25) {
          rootDensityField[x][y] = Math.min(10.0, rootDensityField[x][y] + 0.015);
        } else {
          rootDensityField[x][y] = Math.max(0.0, rootDensityField[x][y] - 0.008);
        }
      }

      // Mycorrhizal connectivity spreading along roots
      if (myceliumField[x][y] > 0.1 && rootDensityField[x][y] > 0.2) {
        myceliumField[x][y] = Math.min(5.0, myceliumField[x][y] + 0.01);
      }
    }
  }

  if (tick % 4 === 0) {
    recordHistory();
  }

  if (tick % 10 === 0 && scopeOpen) {
    updateScopeTelemetry();
  }

  if (tick % DAY_TICKS === 0) {
    day++;
    updateEpochBadge();
    logDaySummary();
  }
}

function recordHistory() {
  let totalM = 0, totalR = 0, aquifer = 0;
  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      totalM += moistureField[x][y];
      totalR += rootDensityField[x][y];
      if (y > HEIGHT - 6) aquifer += moistureField[x][y];
    }
  }
  const cells = WIDTH * HEIGHT;
  history.push({
    m: (totalM / cells) * 100,
    r: (totalR / (cells * 0.3)) * 100,
    a: (aquifer / (WIDTH * 6)) * 100
  });

  if (history.length > MAX_POINTS) history.shift();
}

function updateTelemetryHUD() {
  const c = CLIMATES[currentClimateIdx];
  const icon = document.getElementById("climateIcon");
  const name = document.getElementById("climateName");
  const precip = document.getElementById("precipStat");
  const vpd = document.getElementById("vpdStat");

  if (icon) icon.textContent = c.icon;
  if (name) name.textContent = c.name;
  if (precip) precip.textContent = `${c.precip.toFixed(1)} mm/hr`;
  if (vpd) vpd.textContent = `${c.vpd.toFixed(2)} kPa`;
}

function updateScopeTelemetry() {
  let totalM = 0, mycoCount = 0, totalSom = 0, aquiferDepthSum = 0;
  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      totalM += moistureField[x][y];
      totalSom += organicCarbonField[x][y];
      if (myceliumField[x][y] > 0.8) mycoCount++;
      if (y > HEIGHT - 8 && moistureField[x][y] > 0.6) aquiferDepthSum++;
    }
  }

  const cells = WIDTH * HEIGHT;
  const avgMoist = (totalM / cells) * 100;
  const avgSom = (totalSom / cells);
  const waterTableEst = Math.max(0.4, (2.8 - (aquiferDepthSum / (WIDTH * 4)))).toFixed(2);

  const wtEl = document.getElementById("scopeWaterTable");
  const barWt = document.getElementById("barWaterTable");
  const infEl = document.getElementById("scopeInfiltration");
  const barInf = document.getElementById("barInfiltration");
  const mycEl = document.getElementById("scopeMycelium");
  const barMyc = document.getElementById("barMycelium");
  const somEl = document.getElementById("scopeCarbon");
  const barSom = document.getElementById("barCarbon");
  const moistHud = document.getElementById("soilMoistStat");

  if (wtEl) wtEl.textContent = `${waterTableEst} m`;
  if (barWt) barWt.style.width = `${Math.min(100, (aquiferDepthSum / (WIDTH * 8)) * 100)}%`;

  if (infEl) infEl.textContent = `${(12 + avgSom * 1.5).toFixed(1)} mm/h`;
  if (barInf) barInf.style.width = `${Math.min(100, avgSom * 15)}%`;

  if (mycEl) mycEl.textContent = `${mycoCount} Nodes`;
  if (barMyc) barMyc.style.width = `${Math.min(100, (mycoCount / (cells * 0.2)) * 100)}%`;

  if (somEl) somEl.textContent = `${avgSom.toFixed(2)}% SOM`;
  if (barSom) barSom.style.width = `${Math.min(100, avgSom * 18)}%`;

  if (moistHud) moistHud.textContent = `${Math.round(avgMoist)}%`;
}

// ---------- Logging ----------
const terminal = document.getElementById("logTerminal");
const epochBadge = document.getElementById("epochBadge");

function updateEpochBadge() {
  if (epochBadge) epochBadge.textContent = `Day ${day}`;
}

function logLine(text, type = "normal") {
  if (!terminal) return;
  const line = document.createElement("div");
  line.className = `log-line ${type}`;
  line.textContent = `[Day ${day} | T+${tick}] ${text}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
  while (terminal.children.length > 50) terminal.removeChild(terminal.firstChild);
}

function logDaySummary() {
  logLine(`📜 Day ${day} Diagnostic: Watershed equilibrium computed across ${WIDTH * HEIGHT} volumetric cells.`, "day");
}

// ---------- User Interactivity ----------
const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");

canvas.width = WIDTH * CELL_SIZE;
canvas.height = HEIGHT * CELL_SIZE;

const graphCanvas = document.getElementById("graphCanvas");
const gCtx = graphCanvas.getContext("2d");

function resizeGraph() {
  const rect = graphCanvas.getBoundingClientRect();
  graphCanvas.width = rect.width * window.devicePixelRatio;
  graphCanvas.height = 60 * window.devicePixelRatio;
}
window.addEventListener("resize", resizeGraph);

function handlePointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const gridX = Math.floor(((clientX - rect.left) * scaleX) / CELL_SIZE);
  const gridY = Math.floor(((clientY - rect.top) * scaleY) / CELL_SIZE);

  if (gridX < 0 || gridX >= WIDTH || gridY < 0 || gridY >= HEIGHT) return;

  if (activeTool === "taproot") {
    // Plant deep root structure downwards
    for (let y = gridY; y < Math.min(HEIGHT - 2, gridY + 8); y++) {
      rootDensityField[gridX][y] = Math.min(10.0, rootDensityField[gridX][y] + 4.0);
    }
    logLine(`🌱 Hand of the Steward: Seeded deep taproot column at X:${gridX}.`, "event");
  } else if (activeTool === "covercrop") {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = (gridX + dx + WIDTH) % WIDTH;
      rootDensityField[nx][0] = Math.min(5.0, rootDensityField[nx][0] + 3.0);
      organicCarbonField[nx][0] = Math.min(8.0, organicCarbonField[nx][0] + 0.8);
    }
    logLine(`🌿 Hand of the Steward: Planted surface cover crop strip around X:${gridX}.`, "event");
  } else if (activeTool === "biochar") {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = (gridX + dx + WIDTH) % WIDTH;
        const ny = Math.max(0, Math.min(HEIGHT - 1, gridY + dy));
        organicCarbonField[nx][ny] = Math.min(10.0, organicCarbonField[nx][ny] + 3.0);
      }
    }
    logLine(`🪵 Hand of the Steward: Injected porous biochar carbon pocket near (${gridX}, ${gridY}).`, "event");
  } else if (activeTool === "mycelium") {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const nx = (gridX + dx + WIDTH) % WIDTH;
        const ny = Math.max(0, Math.min(HEIGHT - 1, gridY + dy));
        myceliumField[nx][ny] = Math.min(5.0, myceliumField[nx][ny] + 2.5);
      }
    }
    logLine(`🍄 Hand of the Steward: Inoculated mycorrhizal mycelium cluster around (${gridX}, ${gridY}).`, "event");
  } else if (activeTool === "swale") {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = (gridX + dx + WIDTH) % WIDTH;
      moistureField[nx][0] = 1.0;
      organicCarbonField[nx][0] = Math.min(10.0, organicCarbonField[nx][0] + 2.0);
    }
    logLine(`💧 Hand of the Steward: Carved water-retention swale contour at X:${gridX}.`, "event");
  }
}

canvas.addEventListener("pointerdown", (e) => handlePointer(e.clientX, e.clientY));

document.querySelectorAll(".tool-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeTool = btn.getAttribute("data-tool");
    const label = document.getElementById("activeToolName");
    if (label) label.textContent = btn.textContent.replace(/^[^\\s]+\\s*/, "").trim();
  });
});

const scopeBtn = document.getElementById("telemetryToggleBtn");
const scopePanel = document.getElementById("scopePanel");
if (scopeBtn && scopePanel) {
  scopeBtn.addEventListener("click", () => {
    scopeOpen = !scopeOpen;
    scopeBtn.classList.toggle("active", scopeOpen);
    scopePanel.classList.toggle("open", scopeOpen);
    if (scopeOpen) updateScopeTelemetry();
  });
}

// ---------- Visual Rendering ----------
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      const m = moistureField[x][y];
      const som = organicCarbonField[x][y];
      const roots = rootDensityField[x][y];
      const myco = myceliumField[x][y];

      // Depth gradient from surface loam to deep bedrock
      const depthFactor = y / HEIGHT;

      const r = Math.round(18 + (som * 4.5) * (1 - depthFactor * 0.5));
      const g = Math.round(24 + (m * 45) + (roots * 8));
      const b = Math.round(36 + (m * 70) + (depthFactor * 40));

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

      // Render root strands
      if (roots > 0.1) {
        ctx.fillStyle = `rgba(34, 197, 94, ${Math.min(0.85, roots * 0.25)})`;
        ctx.fillRect(px + 4, py + 1, CELL_SIZE - 8, CELL_SIZE - 2);
      }

      // Render glowing mycorrhizal hyphae
      if (myco > 0.2) {
        ctx.strokeStyle = `rgba(168, 85, 247, ${Math.min(0.8, myco * 0.3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, py + CELL_SIZE / 2);
        ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE / 2);
        ctx.stroke();
      }
    }
  }
}

function renderGraph() {
  const w = graphCanvas.width;
  const h = graphCanvas.height;
  if (w === 0 || h === 0 || history.length === 0) return;

  gCtx.clearRect(0, 0, w, h);
  gCtx.strokeStyle = "#131d31";
  gCtx.lineWidth = 1;
  gCtx.beginPath();
  gCtx.moveTo(0, h * 0.5); gCtx.lineTo(w, h * 0.5);
  gCtx.stroke();

  const stepX = w / Math.max(MAX_POINTS - 1, 1);
  const startIdx = MAX_POINTS - history.length;

  function drawLine(key, color) {
    gCtx.strokeStyle = color;
    gCtx.lineWidth = 1.8;
    gCtx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = (startIdx + i) * stepX;
      const val = Math.min(100, Math.max(0, history[i][key]));
      const y = h - (val / 100) * (h - 6) - 3;
      if (i === 0) gCtx.moveTo(x, y);
      else gCtx.lineTo(x, y);
    }
    gCtx.stroke();
  }

  drawLine("m", "#38bdf8"); // Moisture (blue)
  drawLine("r", "#22c55e"); // Root biomass (green)
  drawLine("a", "#0284c7"); // Deep aquifer (dark blue)
}

let lastTimestamp = 0;
function loop(ts) {
  if (!lastTimestamp) lastTimestamp = ts;
  if (ts - lastTimestamp > TICK_MS) {
    stepSimulation();
    lastTimestamp = ts;
  }
  render();
  renderGraph();
  requestAnimationFrame(loop);
}

// Initial Boot
resizeGraph();
logLine("🌱 Initializing Decentralized Biosphere Digital Twin v0.1...", "day");
logLine("💧 Soil hydrology, root transpiration, and mycelium ODE models active.", "event");
requestAnimationFrame(loop);
