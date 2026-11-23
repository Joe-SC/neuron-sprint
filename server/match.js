import { generate as genCalc, isCorrect as checkCalc } from "../shared/calculations.js";
import { generate as genStroop, isCorrect as checkStroop } from "../shared/stroop.js";
import { generate as genNum, isCorrect as checkNum } from "../shared/numberCruncher.js";
import { generate as genBird, isCorrect as checkBird } from "../shared/birdWatching.js";
import { generate as genMaze } from "../shared/connectMaze.js";
import { generate as genLowToHigh } from "../shared/lowToHigh.js";
import { brainAge, exercisePoorness, speedMetaphor } from "../shared/brainAge.js";

const ALL_GAMES = ["calculations", "stroop", "numberCruncher", "birdWatching", "connectMaze", "lowToHigh"];
const RACE_GAMES = ["calculations", "stroop", "numberCruncher", "birdWatching"];
const TIMED_GAMES = ["connectMaze", "lowToHigh"];
const ROUND_TIMEOUT_RACE = 25000;
const ROUND_TIMEOUT_TIMED = 90000;
const COUNTDOWN_MS = 400;
const RESULT_DELAY_MS = 600;

export class Match {
  /**
   * @param {import('./room.js').Room} room
   * @param {import('./room.js').Player[]} players
   * @param {{mode:string,games?:string[],rounds?:number}} config
   */
  constructor(room, players, config) {
    this.room = room;
    this.players = players; // array of player objects from room
    this.config = config;
    this.aborted = false;
    this.currentRound = 0;
    this.totalRounds = 0;
    this.scores = new Map(); // playerId -> {points, stats:{...}}
    for (const p of players) {
      this.scores.set(p.id, { points: 0, stats: {} });
    }

    // Round state (updated per round)
    this._round = null; // {id, game, resolve, timer, answerSet, goAt}
  }

  start() {
    const { mode, games } = this.config;
    let pool = games && games.length ? games.filter(g => ALL_GAMES.includes(g)) : ALL_GAMES.slice();
    if (!pool.length) pool = ALL_GAMES.slice();
    this.gamePool = pool;

    this.broadcast({ type: "matchStart", mode, players: this.players.map(p => p.name) });

    if (mode === "check") {
      this._runCheck();
    } else if (mode === "solo") {
      this._runCheck(); // solo uses same exercise flow
    } else {
      // versus (default)
      this.totalRounds = this.config.rounds || 7;
      this._nextRound();
    }
  }

  abort(reason) {
    this.aborted = true;
    this._clearRound();
    this.broadcast({ type: "matchAborted", reason });
  }

  onAnswer(playerId, msg) {
    if (this.aborted) return;
    const round = this._round;
    if (!round || msg.roundId !== round.id) return;

    const { mode } = this.config;

    if (mode === "check" || mode === "solo") {
      this._onCheckAnswer(playerId, msg);
      return;
    }

    const game = round.game;
    if (RACE_GAMES.includes(game)) {
      this._onRaceAnswer(playerId, msg, round);
    } else if (TIMED_GAMES.includes(game)) {
      this._onTimedAnswer(playerId, msg, round);
    }
  }

  // ─── Race rounds (first correct wins) ───

  _nextRound() {
    if (this.aborted) return;
    if (this.currentRound >= this.totalRounds) {
      this._endMatch();
      return;
    }

    const game = this.gamePool[this.currentRound % this.gamePool.length];
    const roundId = this.currentRound;
    const goAt = Date.now() + COUNTDOWN_MS;

    // Generate ONE question payload, sent identically to both players
    let payload;
    switch (game) {
      case "calculations": payload = genCalc({ count: 1 })[0]; break;
      case "stroop": payload = genStroop({ count: 1 })[0]; break;
      case "numberCruncher": payload = genNum({ count: 10 }); break;
      case "birdWatching": payload = genBird(); break;
      case "connectMaze": payload = genMaze(); break;
      case "lowToHigh": payload = genLowToHigh(); break;
    }

    const round = { id: roundId, game, payload, goAt, answers: new Map(), done: false, resolve: null, timer: null };
    this._round = round;

    const isTimed = TIMED_GAMES.includes(game);
    const timeoutMs = isTimed ? ROUND_TIMEOUT_TIMED : ROUND_TIMEOUT_RACE;

    this.broadcast({
      type: "roundStart",
      roundId,
      game,
      payload: isTimed ? null : payload, // timed games get their own payloads via per-player channel
      goAt,
      roundIndex: this.currentRound,
      totalRounds: this.totalRounds,
      mode: "versus",
      scores: this._scoreSnapshot(),
    });

    // For timed games: send each player a unique copy of the puzzle
    if (isTimed) {
      for (const p of this.players) {
        let pPayload;
        if (game === "connectMaze") pPayload = genMaze();
        else if (game === "lowToHigh") pPayload = genLowToHigh();
        this.room.send(p.ws, { type: "roundPayload", roundId, payload: pPayload, goAt });
      }
    }

    const timeLeft = goAt + timeoutMs - Date.now();
    round.timer = setTimeout(() => {
      if (!round.done) {
        round.done = true;
        this._scoreRaceRound(round);
        this._advanceRound();
      }
    }, Math.max(0, timeLeft));

    return new Promise((resolve) => { round.resolve = resolve; });
  }

  _onRaceAnswer(playerId, msg, round) {
    if (round.done) return;
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    const correct = this._checkAnswer(round.game, round.payload, msg.answer);
    const timeMs = Date.now() - round.goAt;

    if (correct) {
      round.done = true;
      this._clearRoundTimer();
      this.scores.get(playerId).points++;
      this._recordStats(playerId, round.game, timeMs, true);
      this.broadcast({
        type: "roundResult",
        roundId: round.id,
        game: round.game,
        winner: player.name,
        winnerId: playerId,
        yourTimeMs: timeMs,
        correct: true,
        scores: this._scoreSnapshot(),
      });
      // slight delay before next round
      setTimeout(() => this._advanceRound(), RESULT_DELAY_MS);
    } else {
      this._recordStats(playerId, round.game, timeMs, false);
      this.room.send(player.ws, {
        type: "roundResult",
        roundId: round.id,
        correct: false,
        yourTimeMs: timeMs,
      });
    }
  }

  _onTimedAnswer(playerId, msg, round) {
    if (round.done) return;
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    // Timed completion: msg.completed = { timeMs, mistakes }
    const completed = msg.completed;
    if (!completed) return;

    round.answers.set(playerId, completed);
    this._recordStats(playerId, round.game, completed.timeMs, completed.mistakes === 0);

    // Check if all have answered
    if (round.answers.size >= this.players.length) {
      round.done = true;
      this._clearRoundTimer();
      this._scoreTimedRound(round);
      setTimeout(() => this._advanceRound(), RESULT_DELAY_MS);
    }
  }

  _scoreTimedRound(round) {
    const entries = this.players.map(p => {
      const a = round.answers.get(p.id) || { timeMs: ROUND_TIMEOUT_TIMED, mistakes: 99 };
      return { id: p.id, name: p.name, effective: a.timeMs + a.mistakes * 500, timeMs: a.timeMs, mistakes: a.mistakes };
    });
    entries.sort((a, b) => a.effective - b.effective);
    const winner = entries[0];

    if (this.players.length >= 2) {
      this.scores.get(winner.id).points++;
    }

    this.broadcast({
      type: "roundResult",
      roundId: round.id,
      game: round.game,
      winner: winner.name,
      winnerId: winner.id,
      timedResults: entries.map(e => ({
        name: e.name, timeMs: e.timeMs, mistakes: e.mistakes, effective: e.effective,
      })),
      scores: this._scoreSnapshot(),
    });
  }

  _scoreRaceRound(round) {
    // Called on timeout: if only one answered correctly, they win; else no winner
    const correctPlayers = this.players.filter(p => {
      const a = round.answers.get(p.id);
      return a && a.correct;
    });
    if (correctPlayers.length === 1) {
      this.scores.get(correctPlayers[0].id).points++;
    }
    this.broadcast({ type: "roundResult", roundId: round.id, game: round.game, winner: null, timeout: true, scores: this._scoreSnapshot() });
  }

  // ─── Check / Solo mode ───

  async _runCheck() {
    const exercises = ["calculations", "stroop", "numberCruncher"];
    const exerciseCounts = { calculations: 20, stroop: 30, numberCruncher: 15 };
    const perPlayerStats = {};

    for (const p of this.players) {
      perPlayerStats[p.id] = { times: [], corrects: 0, total: 0, mistakes: 0 };
    }

    for (const game of exercises) {
      // Generate per-player payloads
      const playerPayloads = {};
      const total = exerciseCounts[game];
      for (const p of this.players) {
        let questions;
        switch (game) {
          case "calculations": questions = genCalc({ count: total }); break;
          case "stroop": questions = genStroop({ count: total }); break;
          case "numberCruncher": questions = []; for (let i = 0; i < total; i++) questions.push(genNum({ count: 10 })); break;
        }
        playerPayloads[p.id] = questions;
      }

      // Run exercise: send questions one at a time
      for (let i = 0; i < total; i++) {
        for (const p of this.players) {
          const q = playerPayloads[p.id][i];
          this.room.send(p.ws, { type: "checkQuestion", roundId: `${game}-${i}`, game, index: i, total, payload: q });
        }

        // Wait for both/all players to answer
        await new Promise((resolve) => {
          this._checkAwaiting = { game, index: i, players: new Set(this.players.map(p => p.id)), resolve, answers: {} };
          // Timeout per question
          const timer = setTimeout(() => {
            if (this._checkAwaiting) {
              this._checkAwaiting = null;
              resolve();
            }
          }, 10000);
          this._checkTimer = timer;
        });
        if (this.aborted) return;
      }

      // End of exercise: send stats
      for (const p of this.players) {
        const stats = perPlayerStats[p.id];
        const avgMs = stats.times.length ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : 9999;
        const accuracy = stats.total > 0 ? stats.corrects / stats.total : 0;
        this.room.send(p.ws, {
          type: "checkExerciseEnd",
          game,
          avgMs: Math.round(avgMs),
          accuracy: Math.round(accuracy * 100),
          total: stats.total,
          correct: stats.corrects,
        });
      }

      // Brief pause between exercises
      await new Promise(r => setTimeout(r, 2000));
    }

    // Compute brain ages
    const results = this.players.map(p => {
      const stats = perPlayerStats[p.id];
      const avgMs = stats.times.length ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : 9999;
      const accuracy = stats.total > 0 ? stats.corrects / stats.total : 0;
      // Compute poorness per exercise using approximations
      const poornesses = [];
      for (const game of exercises) {
        const poor = exercisePoorness(game, { avgMs: avgMs, accuracy: accuracy, mistakes: stats.mistakes });
        poornesses.push(poor);
      }
      return {
        name: p.name,
        brainAge: brainAge(poornesses),
        metaphor: speedMetaphor(poornesses.reduce((a, b) => a + b, 0) / poornesses.length),
        accuracy: Math.round(accuracy * 100),
        avgMs: Math.round(avgMs),
      };
    });

    this.broadcast({
      type: "matchEnd",
      mode: this.config.mode,
      results,
      winner: results.length >= 2 ? (results[0].brainAge < results[1].brainAge ? results[0].name : results[1].name) : results[0].name,
    });

    this.room.match = null;
  }

  _onCheckAnswer(playerId, msg) {
    if (!this._checkAwaiting) return;
    const { game, index, players, resolve, answers } = this._checkAwaiting;
    if (!players.has(playerId)) return;
    players.delete(playerId);

    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    // Validate
    const correct = this._checkAnswer(game, msg.payload, msg.answer);
    const stats = this._checkGetStats(playerId);
    stats.total++;
    if (correct) stats.corrects++;
    else stats.mistakes++;

    if (msg.timeMs) stats.times.push(msg.timeMs);

    this.room.send(player.ws, {
      type: "checkResult",
      roundId: msg.roundId,
      correct,
      correctAnswer: msg.payload.answer ?? msg.payload.ink ?? undefined,
      timeMs: msg.timeMs || 0,
    });

    if (players.size === 0) {
      clearTimeout(this._checkTimer);
      this._checkAwaiting = null;
      resolve();
    }
  }

  _checkGetStats(playerId) {
    // Lazy-init per-player stats tracked inside the match
    if (!this._checkStats) this._checkStats = {};
    if (!this._checkStats[playerId]) this._checkStats[playerId] = { times: [], corrects: 0, total: 0, mistakes: 0 };
    return this._checkStats[playerId];
  }

  // ─── Helpers ───

  _advanceRound() {
    this._clearRound();
    this.currentRound++;
    this._nextRound();
  }

  _clearRound() {
    if (this._round) {
      clearTimeout(this._round.timer);
      this._round = null;
    }
  }

  _clearRoundTimer() {
    if (this._round && this._round.timer) {
      clearTimeout(this._round.timer);
      this._round.timer = null;
    }
  }

  _checkAnswer(game, payload, answer) {
    switch (game) {
      case "calculations": return checkCalc(payload, answer);
      case "stroop": return checkStroop(payload, answer);
      case "numberCruncher": return checkNum(payload, answer);
      case "birdWatching": return checkBird(payload, answer);
      case "connectMaze":
      case "lowToHigh":
        return true; // client-reported completion; no server validation of individual taps
      default:
        return false;
    }
  }

  _recordStats(playerId, game, timeMs, correct) {
    const stats = this.scores.get(playerId).stats;
    if (!stats[game]) stats[game] = { total: 0, correct: 0, times: [] };
    stats[game].total++;
    if (correct) stats[game].correct++;
    stats[game].times.push(timeMs);
  }

  _scoreSnapshot() {
    return Array.from(this.scores.entries()).map(([id, s]) => ({
      id,
      name: this.players.find(p => p.id === id)?.name ?? "?",
      points: s.points,
    }));
  }

  _endMatch() {
    const sorted = Array.from(this.scores.entries())
      .map(([id, s]) => ({ id, name: this.players.find(p => p.id === id)?.name ?? "?", points: s.points }))
      .sort((a, b) => b.points - a.points);
    const winner = sorted.length >= 2 && sorted[0].points > sorted[1].points ? sorted[0].name : null;

    this.broadcast({
      type: "matchEnd",
      mode: "versus",
      scores: sorted,
      winner,
    });
    this.room.match = null;
  }

  broadcast(obj) {
    this.room.broadcast(obj);
  }
}