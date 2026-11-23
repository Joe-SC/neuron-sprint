import { connect, send, close as netClose } from "./net.js";
import { createNumpad } from "./numpad.js";
import { el, clear, mountCountdown, mountScoreboard, updateScoreboard, roundProgress, showFlash, showToast, setupCanvas, dprScale } from "./render.js";
import { beepCorrect, beepWrong, beepWin, beepCountdown, beepGo } from "./audio.js";
import { mountCalculations } from "./games/calculations.js";
import { mountStroop } from "./games/stroop.js";
import { mountNumberCruncher } from "./games/numberCruncher.js";
import { mountBirdWatching } from "./games/birdWatching.js";
import { mountConnectMaze } from "./games/connectMaze.js";
import { mountLowToHigh } from "./games/lowToHigh.js";

// ── State ──
let myId = null;
let isHost = false;
let currentScreen = "lobby";
let matchView = null; // { sb, progressEl, gameArea, countdownCancel, gameRenderer }
let stampDays = 0;

// ── Screen helpers ──
const app = document.getElementById("app");

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  let screen = document.getElementById(id);
  if (!screen) {
    screen = el("div", `screen ${id}`);
    screen.id = id;
    app.appendChild(screen);
  }
  screen.classList.add("active");
  currentScreen = id;
}

function mountScreen(id) {
  let screen = document.getElementById(id);
  if (!screen) {
    screen = el("div", `screen ${id}`);
    screen.id = id;
    app.appendChild(screen);
  }
  return screen;
}

// ── Lobby ──
function buildLobby() {
  showScreen("lobby");
  const s = document.getElementById("lobby");
  clear(s);

  s.innerHTML = `
    <div class="lobby-header">
      <h1>Neuron Sprint</h1>
      <p>Brain training for two</p>
    </div>
    <input type="text" class="name-input" id="nameInput" maxlength="20" placeholder="Your name">
    <ul class="player-list" id="playerList"></ul>
    <div class="lobby-actions">
      <button class="btn btn-secondary" id="readyBtn">Ready</button>
      <button class="btn btn-primary" id="startBtn" disabled>Start Match</button>
      <button class="btn btn-secondary" id="modeBtn">Mode: Versus</button>
    </div>
  `;

  const nameInput = document.getElementById("nameInput");
  const playerList = document.getElementById("playerList");
  const readyBtn = document.getElementById("readyBtn");
  const startBtn = document.getElementById("startBtn");
  const modeBtn = document.getElementById("modeBtn");

  let ready = false;
  let mode = "versus";
  let players = [];

  nameInput.addEventListener("input", () => {
    send({ type: "rename", name: nameInput.value.trim() || "Player" });
  });

  readyBtn.addEventListener("click", () => {
    ready = !ready;
    readyBtn.textContent = ready ? "Ready ✓" : "Ready";
    readyBtn.classList.toggle("btn-primary", ready);
    readyBtn.classList.toggle("btn-secondary", !ready);
    send({ type: "ready", ready });
  });

  modeBtn.addEventListener("click", () => {
    const modes = ["versus", "check", "solo"];
    const idx = (modes.indexOf(mode) + 1) % modes.length;
    mode = modes[idx];
    modeBtn.textContent = `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
    updateStartBtn();
  });

  startBtn.addEventListener("click", () => {
    if (!isHost || !players.every(p => p.ready || p.host)) return;
    send({ type: "startMatch", config: { mode, games: [], rounds: 7 } });
    startBtn.disabled = true;
  });

  function updateStartBtn() {
    if (!isHost) { startBtn.disabled = true; return; }
    if (mode === "solo") { startBtn.disabled = false; return; }
    const allReady = players.length >= 2 && players.every(p => p.ready || p.host);
    startBtn.disabled = !allReady;
  }

  window._lobbyUpdate = (msg) => {
    players = msg.players || [];
    playerList.innerHTML = players.map(p => {
      const badges = [];
      if (p.host) badges.push('<span class="badge badge-host">HOST</span>');
      badges.push(p.ready ? '<span class="badge badge-ready">READY</span>' : '<span class="badge badge-waiting">WAITING</span>');
      return `<li><span class="name">${esc(p.name)}</span> ${badges.join(" ")}</li>`;
    }).join("");
    isHost = players.find(p => p.id === myId)?.host ?? false;
    updateStartBtn();
    // Disable mode/start when match is running
    if (msg.matchRunning) {
      startBtn.disabled = true;
      modeBtn.disabled = true;
    } else {
      modeBtn.disabled = false;
      updateStartBtn();
    }
  };

  updateStartBtn();
}

// ── Match ──
function startMatch(config) {
  showScreen("match");
  const s = document.getElementById("match");
  clear(s);

  matchView = {
    sb: null,
    progressEl: null,
    gameArea: el("div", "game-area"),
    countdownCancel: null,
    gameRenderer: null,
    currentRound: 0,
    totalRounds: config.rounds || 0,
    mode: config.mode || "versus",
  };

  // Scoreboard
  matchView.sb = mountScoreboard(s, (config.players || ["You", "Opponent"]).map(n => ({ name: n, points: 0 })));
  matchView.progressEl = roundProgress(s, 0, matchView.totalRounds || 1);
  s.appendChild(matchView.gameArea);
}

function onRoundStart(msg) {
  if (!matchView) return;
  matchView.currentRound = msg.roundIndex ?? 0;

  // Clean up previous game renderer
  if (matchView.gameRenderer) {
    matchView.gameRenderer.destroy();
    matchView.gameRenderer = null;
  }
  clear(matchView.gameArea);

  // Update progress
  if (matchView.progressEl) {
    matchView.progressEl.textContent = `Round ${matchView.currentRound + 1} of ${matchView.totalRounds}`;
  }

  const game = msg.game;
  const gameArea = matchView.gameArea;

  // Show countdown
  const countdown = mountCountdown(gameArea, () => {
    beepGo();
    if (matchView.gameRenderer && matchView.gameRenderer.enable) {
      matchView.gameRenderer.enable();
    }
  });

  // Build the game renderer
  let renderer;
  switch (game) {
    case "calculations":
      renderer = mountCalculations(gameArea, msg.payload, { onSubmit: (answer) => {
        send({ type: "answer", roundId: msg.roundId, answer });
      }});
      break;
    case "stroop":
      renderer = mountStroop(gameArea, msg.payload, { onSubmit: (answer) => {
        send({ type: "answer", roundId: msg.roundId, answer });
      }});
      break;
    case "numberCruncher":
      renderer = mountNumberCruncher(gameArea, msg.payload, msg.goAt, { onSubmit: (answer) => {
        send({ type: "answer", roundId: msg.roundId, answer });
      }});
      break;
    case "birdWatching":
      renderer = mountBirdWatching(gameArea, msg.payload, msg.goAt, { onSubmit: (answer) => {
        send({ type: "answer", roundId: msg.roundId, answer });
      }});
      break;
    case "connectMaze":
    case "lowToHigh":
      // Timed games: wait for roundPayload first
      break;
    default:
      gameArea.innerHTML = `<div class="question-text">Unknown game: ${game}</div>`;
  }

  matchView.gameRenderer = renderer;
}

function onRoundPayload(msg) {
  if (!matchView) return;
  const game = document.querySelector("#match .round-progress") ? matchView.currentRound : null;
  // Determine game from context — re-use same renderer creation but for timed games
  if (!matchView.gameRenderer) {
    const gameArea = matchView.gameArea;
    const payload = msg.payload;
    let renderer;
    // Check if it's connectMaze or lowToHigh — we stored the game name
    // We can infer from payload.kind
    if (payload.kind === "connectMaze") {
      renderer = mountConnectMaze(gameArea, payload, msg.goAt, {
        onComplete: (timeMs, mistakes) => {
          send({ type: "answer", roundId: msg.roundId, completed: { timeMs, mistakes } });
        }
      });
    } else if (payload.kind === "lowToHigh") {
      renderer = mountLowToHigh(gameArea, payload, msg.goAt, {
        onComplete: (timeMs, mistakes) => {
          send({ type: "answer", roundId: msg.roundId, completed: { timeMs, mistakes } });
        }
      });
    }
    if (renderer) matchView.gameRenderer = renderer;
  }
}

function onRoundResult(msg) {
  if (!matchView) return;

  if (msg.timeout) {
    showFlash(matchView.gameArea, "incorrect", "Time's up!", "No winner this round", 1500);
    return;
  }

  if (msg.correct !== undefined) {
    // Race game result
    if (msg.correct) {
      beepCorrect();
      if (msg.winnerId === myId) {
        showFlash(matchView.gameArea, "correct", "Correct!", `${msg.winner} wins this round`, 1200);
      } else {
        showFlash(matchView.gameArea, "incorrect", `${msg.winner} wins!`, `You: ${msg.yourTimeMs || 0}ms`, 1200);
      }
    } else {
      // Wrong answer — brief flash, player can retry
      beepWrong();
      showFlash(matchView.gameArea, "incorrect", "Wrong!", "Try again", 600);
    }
  }

  if (msg.timedResults) {
    // Timed game result
    const my = msg.timedResults.find(r => r.name === document.querySelector(".score-item .name")?.textContent);
    const winner = msg.timedResults[0];
    beepCorrect();
    showFlash(matchView.gameArea, "correct", `${msg.winner} wins!`, `Best: ${winner.effective}ms effective time`, 1800);
  }

  // Update scoreboard
  if (msg.scores) {
    updateScoreboard(matchView.sb, msg.scores);
  }
}

function onMatchEnd(msg) {
  if (!matchView) {
    // Check mode match end
    showCheckResults(msg);
    return;
  }
  const mode = msg.mode || "versus";

  if (mode === "check") {
    showCheckResults(msg);
    return;
  }

  // Versus or solo results
  showScreen("results");
  const s = document.getElementById("results");
  clear(s);

  const winner = msg.winner;
  const scores = msg.scores || [];
  const isTie = scores.length >= 2 && scores[0].points === scores[1].points;

  let html = `<h2>${isTie ? "It's a tie!" : (winner ? `${esc(winner)} wins!` : "Match over")}</h2>`;
  html += `<div class="trophy">${isTie ? "🤝" : (winner ? "🏆" : "🏁")}</div>`;

  scores.forEach((s, i) => {
    const cls = i === 0 && !isTie ? "score-row winner" : "score-row";
    html += `<div class="${cls}"><span>${esc(s.name)}</span><span>${s.points} pts</span></div>`;
  });

  // Stamps
  stampDays++;
  saveStamp();
  html += `<div class="stamps"><div class="stamps-grid">${getStampHTML()}</div></div>`;

  html += `<button class="btn btn-primary" id="backToLobby" style="margin-top:20px">Back to Lobby</button>`;
  s.innerHTML = html;
  s.querySelector("#backToLobby").addEventListener("click", () => {
    matchView = null;
    buildLobby();
  });

  if (winner) beepWin();

  matchView = null;
}

function showCheckResults(msg) {
  showScreen("results");
  const s = document.getElementById("results");
  clear(s);

  const results = msg.results || [];
  const winner = msg.winner;

  let html = `<h2>Brain Age Results</h2>`;
  html += `<div class="trophy">${results.length >= 2 ? (winner ? "🏆" : "🤝") : "🧠"}</div>`;

  results.forEach(r => {
    const isWin = r.name === winner;
    html += `<div class="score-row ${isWin ? "winner" : ""}">
      <div>
        <strong>${esc(r.name)}</strong><br>
        <span style="font-size:0.85rem;color:#94a3b8">${r.accuracy}% accuracy</span>
      </div>
      <div style="text-align:right">
        <div style="font-size:1.8rem;font-weight:900;color:#f59e0b">${r.brainAge}</div>
        <div style="font-size:0.75rem;color:#94a3b8">${r.metaphor}</div>
      </div>
    </div>`;
  });

  html += `<div class="metaphor">Lower brain age = better performance</div>`;
  stampDays++;
  saveStamp();
  html += `<div class="stamps"><div class="stamps-grid">${getStampHTML()}</div></div>`;

  html += `<button class="btn btn-primary" id="backToLobby" style="margin-top:20px">Back to Lobby</button>`;
  s.innerHTML = html;
  s.querySelector("#backToLobby").addEventListener("click", () => {
    matchView = null;
    buildLobby();
  });

  beepWin();
  matchView = null;
}

// ── Check mode question flow ──
let checkState = null; // { container, gameArea, currentGame, answerCb, numpad }

function onCheckQuestion(msg) {
  if (!checkState) {
    showScreen("match");
    const s = document.getElementById("match");
    clear(s);
    s.innerHTML = `<div class="question-text" style="text-align:center;padding:12px">Exercise</div>`;
    const ga = el("div", "game-area");
    s.appendChild(ga);
    checkState = { container: s, gameArea: ga, currentGame: null, answerCb: null, numpad: null };
  }

  const ga = checkState.gameArea;
  clear(ga);
  checkState.currentGame = msg.game;

  const game = msg.game;
  const payload = msg.payload;

  let renderer;
  const callbacks = {
    onSubmit: (answer) => {
      const timeMs = Date.now() - (checkState._startTime || Date.now());
      send({ type: "answer", roundId: msg.roundId, answer, timeMs, payload });
    }
  };

  switch (game) {
    case "calculations":
      renderer = mountCalculations(ga, payload, callbacks);
      break;
    case "stroop":
      renderer = mountStroop(ga, payload, callbacks);
      break;
    case "numberCruncher":
      renderer = mountNumberCruncher(ga, payload, Date.now(), callbacks);
      break;
    default:
      ga.innerHTML = `<div class="question-text">${game}</div>`;
  }

  checkState._startTime = Date.now();
  // For check mode, no countdown — just start
  if (renderer && renderer.enable) renderer.enable();
}

function onCheckResult(msg) {
  if (!checkState) return;
  const ga = checkState.gameArea;
  clear(ga);

  if (msg.correct) {
    beepCorrect();
    ga.innerHTML = `<div class="question-text" style="color:#22c55e">✓ Correct</div>`;
  } else {
    beepWrong();
    ga.innerHTML = `<div class="question-text" style="color:#ef4444">✗ Incorrect<br><span style="font-size:0.9rem;color:#94a3b8">Answer: ${esc(msg.correctAnswer)}</span></div>`;
  }
}

function onCheckExerciseEnd(msg) {
  if (!checkState) return;
  const ga = checkState.gameArea;
  clear(ga);

  ga.innerHTML = `<div class="check-exercise-end">
    <h3>${esc(msg.game)} done!</h3>
    <p>Average time: ${msg.avgMs}ms</p>
    <p>Accuracy: ${msg.accuracy}%</p>
  </div>`;
}

// ── Stamps (localStorage) ──
function saveStamp() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    let stamps = JSON.parse(localStorage.getItem("ns_stamps") || "[]");
    if (!stamps.includes(today)) stamps.push(today);
    localStorage.setItem("ns_stamps", JSON.stringify(stamps));
  } catch {}
}

function getStampHTML() {
  try {
    const stamps = JSON.parse(localStorage.getItem("ns_stamps") || "[]");
    const last7 = stamps.slice(-7);
    return last7.map(d => `<span class="stamp">🧠</span>`).join("") || "No stamps yet";
  } catch { return ""; }
}

// ── WebSocket message handler ──
connect({
  onmessage(msg) {
    switch (msg.type) {
      case "welcome":
        myId = msg.playerId;
        isHost = msg.host;
        buildLobby();
        break;

      case "players":
        if (window._lobbyUpdate) window._lobbyUpdate(msg);
        break;

      case "matchStart":
        startMatch(msg);
        break;

      case "roundStart":
        onRoundStart(msg);
        break;

      case "roundPayload":
        onRoundPayload(msg);
        break;

      case "roundResult":
        onRoundResult(msg);
        break;

      case "matchEnd":
        onMatchEnd(msg);
        break;

      case "checkQuestion":
        onCheckQuestion(msg);
        break;

      case "checkResult":
        onCheckResult(msg);
        break;

      case "checkExerciseEnd":
        onCheckExerciseEnd(msg);
        break;

      case "matchAborted":
        showToast(msg.reason || "Match ended");
        matchView = null;
        buildLobby();
        break;

      case "error":
        showToast(msg.message || "Server error");
        break;
    }
  },
  onclose() {
    showToast("Disconnected from server");
  },
});

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" })[c]); }