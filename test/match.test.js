import { test } from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { Room } from "../server/room.js";

// ── Message queue helper ──

const msgQueues = new WeakMap();

function queueFor(ws) {
  if (!msgQueues.has(ws)) {
    const queue = [];
    queue._waiters = [];
    msgQueues.set(ws, queue);
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      queue.push(msg);
      for (const w of queue._waiters) w(msg);
    });
  }
  return msgQueues.get(ws);
}

function waitFor(ws, type, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const queue = queueFor(ws);
    const timeout = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeoutMs);

    const idx = queue.findIndex(m => m.type === type);
    if (idx !== -1) {
      clearTimeout(timeout);
      resolve(queue.splice(idx, 1)[0]);
      return;
    }

    const waiter = (msg) => {
      if (msg.type === type) {
        const i = queue.indexOf(msg);
        if (i !== -1) queue.splice(i, 1);
        queue._waiters = queue._waiters.filter(w => w !== waiter);
        clearTimeout(timeout);
        resolve(msg);
      }
    };
    queue._waiters.push(waiter);
  });
}

/** Drain any stale players messages until one contains a player with the given name. */
async function waitForPlayerNamed(ws, name, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const msg = await waitFor(ws, "players", Math.max(remaining, 1000));
    if (msg.players.find(p => p.name === name)) return msg;
  }
  throw new Error(`timeout waiting for player named ${name}`);
}

function send(ws, obj) {
  ws.send(JSON.stringify(obj));
}

// ── Helper: create a server + 2 connections on random port ──

async function setup() {
  const server = createServer();
  const wss = new WebSocketServer({ server });
  const room = new Room();
  wss.on("connection", (ws) => room.addClient(ws));
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const p1 = new WebSocket(`ws://127.0.0.1:${port}`);
  const p2 = new WebSocket(`ws://127.0.0.1:${port}`);
  await Promise.all([waitFor(p1, "welcome"), waitFor(p2, "welcome")]);
  return { server, p1, p2 };
}

function teardown({ server, p1, p2 }) {
  p1.close();
  p2.close();
  server.close();
}

// ── Tests ──

test("full match lifecycle (connect, rename, ready, race round, match end)", async (t) => {
  const { server, p1, p2 } = await setup();

  // Rename one at a time, waiting for the players list to reflect the change
  send(p1, { type: "rename", name: "Alice" });
  const pl1 = await waitForPlayerNamed(p1, "Alice");
  assert.equal(pl1.players.length, 2);

  send(p2, { type: "rename", name: "Bob" });
  const pl2 = await waitForPlayerNamed(p1, "Bob");
  assert.equal(pl2.players.length, 2);

  // Ready up
  send(p1, { type: "ready", ready: true });
  await waitForPlayerNamed(p1, "Alice"); // players will re-broadcast

  send(p2, { type: "ready", ready: true });
  await waitForPlayerNamed(p1, "Bob");

  // Host starts match
  send(p1, { type: "startMatch", config: { mode: "versus", games: ["calculations"], rounds: 3 } });
  await waitFor(p1, "matchStart");

  // Round 1
  const rs1 = await waitFor(p1, "roundStart");
  await waitFor(p2, "roundStart");

  // Alice answers correctly first
  send(p1, { type: "answer", roundId: rs1.roundId, answer: String(rs1.payload.answer) });
  const r1 = await waitFor(p1, "roundResult");
  assert.equal(r1.correct, true);
  assert.equal(r1.winner, "Alice");
  assert.equal(r1.scores.find(s => s.name === "Alice").points, 1);
  await waitFor(p2, "roundResult");

  // Round 2: Bob answers first
  const rs2 = await waitFor(p1, "roundStart");
  send(p2, { type: "answer", roundId: rs2.roundId, answer: String(rs2.payload.answer) });
  const r2 = await waitFor(p1, "roundResult");
  assert.equal(r2.winner, "Bob");
  await waitFor(p2, "roundResult");

  // Round 3: Alice wins again
  const rs3 = await waitFor(p1, "roundStart");
  send(p1, { type: "answer", roundId: rs3.roundId, answer: String(rs3.payload.answer) });
  await waitFor(p1, "roundResult");
  await waitFor(p2, "roundResult");

  // Match end: Alice wins 2-1
  const me = await waitFor(p1, "matchEnd");
  assert.equal(me.winner, "Alice");
  assert.equal(me.scores.find(s => s.name === "Alice").points, 2);
  assert.equal(me.scores.find(s => s.name === "Bob").points, 1);

  teardown({ server, p1, p2 });
});

test("wrong answer sends correct:false, opponent can still win", async () => {
  const { server, p1, p2 } = await setup();

  send(p1, { type: "rename", name: "A" });
  await waitForPlayerNamed(p1, "A");
  send(p2, { type: "rename", name: "B" });
  await waitForPlayerNamed(p1, "B");

  send(p1, { type: "ready", ready: true });
  await waitForPlayerNamed(p1, "A");
  send(p2, { type: "ready", ready: true });
  await waitForPlayerNamed(p1, "B");

  send(p1, { type: "startMatch", config: { mode: "versus", games: ["calculations"], rounds: 1 } });
  await waitFor(p1, "matchStart");

  const rs = await waitFor(p1, "roundStart");

  // Wrong answer
  send(p1, { type: "answer", roundId: rs.roundId, answer: "99999" });
  const wrong = await waitFor(p1, "roundResult");
  assert.equal(wrong.correct, false);

  // Opponent answers correctly
  send(p2, { type: "answer", roundId: rs.roundId, answer: String(rs.payload.answer) });
  const win = await waitFor(p2, "roundResult");
  assert.equal(win.correct, true);
  assert.equal(win.winner, "B");

  await waitFor(p2, "matchEnd");

  teardown({ server, p1, p2 });
});

test("timed-set game (connectMaze) handles completion", async () => {
  const { server, p1, p2 } = await setup();

  send(p1, { type: "rename", name: "X" });
  await waitForPlayerNamed(p1, "X");
  send(p2, { type: "rename", name: "Y" });
  await waitForPlayerNamed(p1, "Y");

  send(p1, { type: "ready", ready: true });
  await waitForPlayerNamed(p1, "X");
  send(p2, { type: "ready", ready: true });
  await waitForPlayerNamed(p1, "Y");

  send(p1, { type: "startMatch", config: { mode: "versus", games: ["connectMaze"], rounds: 1 } });
  await waitFor(p1, "matchStart");

  const rs = await waitFor(p1, "roundStart");
  assert.equal(rs.game, "connectMaze");

  // Each player gets their own payload
  const pp1 = await waitFor(p1, "roundPayload");
  const pp2 = await waitFor(p2, "roundPayload");
  assert.equal(pp1.roundId, rs.roundId);
  assert.notDeepEqual(pp1.payload, pp2.payload); // different mazes

  // Both complete
  send(p1, { type: "answer", roundId: rs.roundId, completed: { timeMs: 30000, mistakes: 2 } });
  send(p2, { type: "answer", roundId: rs.roundId, completed: { timeMs: 28000, mistakes: 0 } });

  const result = await waitFor(p1, "roundResult");
  assert.ok(result.timedResults);
  assert.equal(result.winner, "Y"); // faster + no mistakes

  await waitFor(p1, "matchEnd");
  teardown({ server, p1, p2 });
});