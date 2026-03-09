#!/usr/bin/env node
/**
 * Hacker Wheel of Fortune - Game Server
 *
 * WebSocket server managing the WoF state machine.
 * 3 contestants spin a wheel and solve hacker-themed word puzzles.
 *
 * Usage: node server.js [port]
 * Default port: 3009
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = parseInt(process.argv[2] || '3009', 10);
const CONTENT_DIR = path.join(__dirname, '..', 'content');

// --- Load content ---
let puzzles = [];
let tossUpPuzzles = [];
let bonusPuzzles = [];

function loadContent() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'puzzles.json'), 'utf8'));
    puzzles = data.puzzles || [];
    tossUpPuzzles = data.tossups || [];
    bonusPuzzles = data.bonus || [];
    console.log(`Loaded ${puzzles.length} main puzzles, ${tossUpPuzzles.length} toss-ups, ${bonusPuzzles.length} bonus puzzles`);
  } catch (e) {
    console.error('Failed to load puzzles.json:', e.message);
    console.log('Using built-in fallback puzzles');
    puzzles = [
      { id: 'fb-1', category: 'Hacker Phrase', answer: 'HACK THE PLANET', tier: 1 },
      { id: 'fb-2', category: 'Security Tool', answer: 'METASPLOIT FRAMEWORK', tier: 2 },
      { id: 'fb-3', category: 'Hacker Phrase', answer: 'ZERO DAY EXPLOIT', tier: 2 },
      { id: 'fb-4', category: 'Security Tool', answer: 'WIRESHARK', tier: 1 },
      { id: 'fb-5', category: 'Protocol', answer: 'SECURE SHELL', tier: 1 },
      { id: 'fb-6', category: 'Notable Hacker', answer: 'KEVIN MITNICK', tier: 1 },
      { id: 'fb-7', category: 'Hacker Phrase', answer: 'SQL INJECTION', tier: 1 },
      { id: 'fb-8', category: 'Security Conference', answer: 'DEF CON', tier: 1 },
      { id: 'fb-9', category: 'Hacker Phrase', answer: 'BUFFER OVERFLOW', tier: 2 },
      { id: 'fb-10', category: 'Security Tool', answer: 'KALI LINUX', tier: 1 },
    ];
    tossUpPuzzles = puzzles.filter(p => p.tier === 1);
    bonusPuzzles = puzzles.filter(p => p.tier >= 2);
  }
}

loadContent();

// --- Wheel wedges ---
const WHEEL_ROUND_1 = [
  { type: 'cash', value: 300 }, { type: 'cash', value: 350 },
  { type: 'cash', value: 400 }, { type: 'cash', value: 450 },
  { type: 'cash', value: 500 }, { type: 'cash', value: 550 },
  { type: 'cash', value: 600 }, { type: 'cash', value: 650 },
  { type: 'cash', value: 700 }, { type: 'cash', value: 750 },
  { type: 'cash', value: 800 }, { type: 'cash', value: 850 },
  { type: 'cash', value: 900 }, { type: 'cash', value: 2500 },
  { type: 'cash', value: 500 }, { type: 'cash', value: 600 },
  { type: 'cash', value: 700 }, { type: 'cash', value: 800 },
  { type: 'bankrupt', value: 0, label: 'PWNED' },
  { type: 'bankrupt', value: 0, label: 'PWNED' },
  { type: 'lose_turn', value: 0, label: 'SIGKILL' },
  { type: 'free_play', value: 0, label: 'FREE SHELL' },
  { type: 'mystery', value: 0, label: '0DAY' },
  { type: 'skeleton_key', value: 0, label: 'SKELETON KEY' },
];

const WHEEL_ROUND_2 = WHEEL_ROUND_1.map(w => {
  if (w.type === 'cash') {
    if (w.value === 2500) return { ...w, value: 3500 };
    return { ...w, value: w.value + 200 };
  }
  return { ...w };
});

const WHEEL_ROUND_3 = WHEEL_ROUND_1.map(w => {
  if (w.type === 'cash') {
    if (w.value === 2500) return { ...w, value: 5000 };
    return { ...w, value: w.value + 400 };
  }
  return { ...w };
});

const BONUS_PRIZES = [
  25000, 30000, 35000, 40000, 45000, 50000,
  25000, 30000, 35000, 40000, 50000, 75000,
  25000, 30000, 35000, 40000, 50000, 100000,
  25000, 30000, 35000, 40000, 50000, 50000,
];

function getWheel(roundNum) {
  if (roundNum <= 1) return WHEEL_ROUND_1;
  if (roundNum === 2) return WHEEL_ROUND_2;
  return WHEEL_ROUND_3;
}

const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';
const VOWELS = 'AEIOU';
const VOWEL_COST = 250;

// --- MIME types ---
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let filePath = req.url === '/' ? '/host.html' : req.url;
  filePath = filePath.split('?')[0];

  if (filePath === '/api/content') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      puzzles: puzzles.length,
      byTier: {
        1: puzzles.filter(p => p.tier === 1).length,
        2: puzzles.filter(p => p.tier === 2).length,
        3: puzzles.filter(p => p.tier === 3).length,
      },
    }));
    return;
  }

  if (filePath === '/api/puzzles') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ puzzles }));
    return;
  }

  // Serve static files
  const ALLOWED_EXTS = new Set(['.html', '.css', '.js', '.png', '.svg']);
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\))+/, '');
  const fullPath = path.join(__dirname, normalizedPath);
  const fullPathResolved = path.resolve(fullPath);
  const webDirResolved = path.resolve(__dirname);

  if (!fullPathResolved.startsWith(webDirResolved + path.sep) && fullPathResolved !== webDirResolved) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const relPath = path.relative(webDirResolved, fullPathResolved);
  if (relPath === 'server.js' || relPath === 'package.json' || relPath === 'package-lock.json' || relPath.startsWith('node_modules')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(fullPath);
  if (!ALLOWED_EXTS.has(ext)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// --- Game State ---

function createGameState() {
  return {
    phase: 'lobby',
    // Players: [{ id, name, bank, roundEarnings, hasSkeletonKey }]
    players: [],
    currentPlayer: 0,  // index into players (0-2)
    roundNumber: 0,     // 0 = not started, 1-3 main rounds
    tossUpNumber: 0,    // 0 = not in toss-up, 1-3

    // Puzzle state
    puzzle: null,        // { category, answer, tier }
    revealedLetters: [], // uppercase letters that have been revealed
    calledLetters: [],   // all letters called so far this round

    // Wheel state
    wheel: [],
    lastSpin: null,      // { wedgeIndex, wedge } — last spin result
    spinAnimating: false,

    // Toss-up state
    tossUp: {
      puzzle: null,
      revealedPositions: [], // indices into the answer string progressively revealed
      revealTimer: null,
      buzzerOpen: false,
      buzzedPlayer: null,
      prize: 0,
    },

    // Speed round
    speedRound: false,
    speedValue: 0,       // per-consonant value (spin + 1000)
    speedTurnTimer: 5,

    // Bonus round
    bonus: {
      active: false,
      player: null,       // player index
      puzzle: null,
      freeLetters: ['R', 'S', 'T', 'L', 'N', 'E'],
      pickedConsonants: [],
      pickedVowel: null,
      allRevealed: [],    // combined free + picked letters
      timeRemaining: 10,
      timerRunning: false,
      prize: 0,
      solved: null,       // true/false/null
      hasSkeletonKey: false,
      extraConsonant: null,
    },

    // Prize puzzle flag
    isPrizePuzzle: false,

    // Mystery/0day state
    mysteryPending: false,  // player landed on mystery and got a correct letter

    // Used puzzle IDs to avoid repeats
    usedPuzzleIds: [],

    // Buzzer connection
    buzzerConnected: false,
  };
}

let game = createGameState();

// --- Timers ---
let tossUpRevealTimer = null;
let bonusTimer = null;
let speedTurnTimer = null;

function clearAllTimers() {
  if (tossUpRevealTimer) { clearInterval(tossUpRevealTimer); tossUpRevealTimer = null; }
  if (bonusTimer) { clearInterval(bonusTimer); bonusTimer = null; }
  if (speedTurnTimer) { clearInterval(speedTurnTimer); speedTurnTimer = null; }
}

// --- Puzzle helpers ---

function selectFromPool(pool, tierPreference) {
  const available = pool.filter(p => !game.usedPuzzleIds.includes(p.id));
  if (available.length === 0) {
    // Reset used list for this pool if exhausted
    const poolIds = new Set(pool.map(p => p.id));
    game.usedPuzzleIds = game.usedPuzzleIds.filter(id => !poolIds.has(id));
    return selectFromPool(pool, tierPreference);
  }
  // Prefer matching tier, fallback to any
  const preferred = tierPreference ? available.filter(p => tierPreference.includes(p.tier)) : available;
  const candidates = preferred.length > 0 ? preferred : available;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  game.usedPuzzleIds.push(pick.id);
  return { category: pick.category, answer: pick.answer.toUpperCase(), tier: pick.tier, id: pick.id };
}

function selectPuzzle(tierPreference) {
  return selectFromPool(puzzles, tierPreference);
}

function selectTossUp() {
  const pool = tossUpPuzzles.length > 0 ? tossUpPuzzles : puzzles.filter(p => p.tier === 1);
  return selectFromPool(pool, [1]);
}

function selectBonusPuzzle() {
  const pool = bonusPuzzles.length > 0 ? bonusPuzzles : puzzles.filter(p => p.tier >= 2);
  return selectFromPool(pool, [2, 3]);
}

function getPuzzleDisplay(answer, revealed) {
  // Returns array of { char, revealed } for each character
  return answer.split('').map(ch => {
    if (ch === ' ') return { char: ' ', revealed: true, space: true };
    if (!/[A-Z]/.test(ch)) return { char: ch, revealed: true, space: false }; // punctuation
    return { char: ch, revealed: revealed.includes(ch), space: false };
  });
}

function countLetter(answer, letter) {
  return answer.split('').filter(ch => ch === letter).length;
}

function isPuzzleSolved(answer, revealed) {
  return answer.split('').every(ch => ch === ' ' || !/[A-Z]/.test(ch) || revealed.includes(ch));
}

function nextPlayer() {
  game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
}

// --- Spin the wheel ---
function spinWheel() {
  const wheel = getWheel(game.roundNumber);
  game.wheel = wheel;
  const idx = Math.floor(Math.random() * wheel.length);
  game.lastSpin = { wedgeIndex: idx, wedge: wheel[idx] };
  return game.lastSpin;
}

// --- WebSocket Server ---

const wss = new WebSocketServer({ server });
const clients = new Map(); // ws -> { role, playerId }

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const [ws] of clients) {
    if (ws.readyState === 1) ws.send(data);
  }
}

function sendTo(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function sendState() {
  for (const [ws, info] of clients) {
    if (ws.readyState !== 1) continue;
    const state = sanitizeState(game, info);
    ws.send(JSON.stringify({ type: 'game-state', state }));
  }
}

function sanitizeState(g, clientInfo) {
  const s = {
    phase: g.phase,
    players: g.players.map(p => ({
      id: p.id,
      name: p.name,
      bank: p.bank,
      roundEarnings: p.roundEarnings,
      hasSkeletonKey: p.hasSkeletonKey,
    })),
    currentPlayer: g.currentPlayer,
    roundNumber: g.roundNumber,
    tossUpNumber: g.tossUpNumber,
    calledLetters: g.calledLetters,
    lastSpin: g.lastSpin,
    spinAnimating: g.spinAnimating,
    speedRound: g.speedRound,
    speedValue: g.speedValue,
    speedTurnTimer: g.speedTurnTimer,
    isPrizePuzzle: g.isPrizePuzzle,
    mysteryPending: g.mysteryPending,
    buzzerConnected: g.buzzerConnected,
  };

  // Puzzle board (always show revealed letters, never the full answer to non-hosts)
  if (g.puzzle) {
    s.puzzle = {
      category: g.puzzle.category,
      display: getPuzzleDisplay(g.puzzle.answer, g.revealedLetters),
      letterCount: g.puzzle.answer.replace(/ /g, '').length,
      wordCount: g.puzzle.answer.split(' ').length,
    };
    if (clientInfo.role === 'host') {
      s.puzzle.answer = g.puzzle.answer;
    }
  }

  // Toss-up state
  s.tossUp = {
    active: g.tossUpNumber > 0 && g.phase === 'toss_up',
    prize: g.tossUp.prize,
    buzzerOpen: g.tossUp.buzzerOpen,
    buzzedPlayer: g.tossUp.buzzedPlayer,
  };
  if (g.tossUp.puzzle) {
    s.tossUp.category = g.tossUp.puzzle.category;
    s.tossUp.display = getPuzzleDisplay(
      g.tossUp.puzzle.answer,
      g.tossUp.revealedPositions.map(i => g.tossUp.puzzle.answer[i]).filter(Boolean)
    );
    if (clientInfo.role === 'host') {
      s.tossUp.answer = g.tossUp.puzzle.answer;
    }
  }

  // Bonus round
  s.bonus = {
    active: g.bonus.active,
    player: g.bonus.player,
    freeLetters: g.bonus.freeLetters,
    pickedConsonants: g.bonus.pickedConsonants,
    pickedVowel: g.bonus.pickedVowel,
    timeRemaining: g.bonus.timeRemaining,
    timerRunning: g.bonus.timerRunning,
    prize: g.bonus.prize,
    solved: g.bonus.solved,
    hasSkeletonKey: g.bonus.hasSkeletonKey,
    extraConsonant: g.bonus.extraConsonant,
  };
  if (g.bonus.puzzle) {
    const allLetters = [...g.bonus.freeLetters, ...g.bonus.pickedConsonants];
    if (g.bonus.pickedVowel) allLetters.push(g.bonus.pickedVowel);
    if (g.bonus.extraConsonant) allLetters.push(g.bonus.extraConsonant);
    s.bonus.category = g.bonus.puzzle.category;
    s.bonus.display = getPuzzleDisplay(g.bonus.puzzle.answer, g.bonus.solved != null ? g.bonus.puzzle.answer.split('') : allLetters);
    if (clientInfo.role === 'host') {
      s.bonus.answer = g.bonus.puzzle.answer;
    }
  }

  // Wheel wedges for display
  s.wheel = getWheel(g.roundNumber).map(w => ({
    type: w.type,
    value: w.value,
    label: w.label || ('$' + w.value),
  }));

  return s;
}

// --- Message handling ---

wss.on('connection', (ws) => {
  clients.set(ws, { role: 'spectator', playerId: null });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    clients.delete(ws);
  });

  // Send initial state
  sendState();
});

function handleMessage(ws, msg) {
  const info = clients.get(ws);

  switch (msg.type) {
    case 'join': {
      info.role = msg.role || 'spectator';
      if (msg.role === 'player' && msg.name) {
        // Check for rejoin by name (reconnection)
        const existing = game.players.find(p => p.name === msg.name);
        if (existing) {
          info.playerId = existing.id;
          sendTo(ws, { type: 'join-response', playerId: existing.id, name: existing.name });
        } else if (game.players.length < 3 && game.phase === 'lobby') {
          // Add new player if we have room
          const id = 'p' + (game.players.length + 1);
          game.players.push({
            id, name: msg.name,
            bank: 0, roundEarnings: 0,
            hasSkeletonKey: false,
          });
          info.playerId = id;
          sendTo(ws, { type: 'join-response', playerId: id, name: msg.name });
        }
      }
      sendState();
      break;
    }

    // Host-only commands
    case 'add-player': {
      if (info.role !== 'host') return;
      if (game.players.length < 3) {
        const id = 'p' + (game.players.length + 1);
        game.players.push({
          id, name: msg.name || ('Player ' + (game.players.length + 1)),
          bank: 0, roundEarnings: 0,
          hasSkeletonKey: false,
        });
      }
      sendState();
      break;
    }

    case 'remove-player': {
      if (info.role !== 'host') return;
      game.players = game.players.filter(p => p.id !== msg.playerId);
      sendState();
      break;
    }

    case 'start-game': {
      if (info.role !== 'host') return;
      if (game.players.length < 1) return; // need at least 1
      startTossUp(1);
      sendState();
      break;
    }

    case 'spin': {
      if (info.role !== 'host') return;
      if (game.phase !== 'awaiting_action') return;
      const result = spinWheel();
      game.spinAnimating = true;
      sendState();
      // After "animation" delay, process the result
      setTimeout(() => {
        game.spinAnimating = false;
        processSpinResult(result);
        sendState();
      }, 2000);
      break;
    }

    case 'call-letter': {
      if (info.role !== 'host') return;
      if (game.phase !== 'awaiting_letter' && game.phase !== 'awaiting_vowel') return;
      const letter = (msg.letter || '').toUpperCase();
      if (!letter || letter.length !== 1) return;
      if (game.calledLetters.includes(letter)) return;
      processLetter(letter);
      sendState();
      break;
    }

    case 'buy-vowel': {
      if (info.role !== 'host') return;
      if (game.phase !== 'awaiting_action') return;
      const player = game.players[game.currentPlayer];
      if (player.roundEarnings < VOWEL_COST) return;
      player.roundEarnings -= VOWEL_COST;
      game.phase = 'awaiting_vowel';
      sendState();
      break;
    }

    case 'solve-attempt': {
      if (info.role !== 'host') return;
      if (!['awaiting_action', 'awaiting_letter', 'awaiting_vowel'].includes(game.phase)) return;
      const guess = (msg.guess || '').toUpperCase().trim();
      if (guess === game.puzzle.answer) {
        solveCorrect();
      } else {
        // Wrong solve — turn passes
        nextPlayer();
        game.phase = 'awaiting_action';
        broadcast({ type: 'event', event: 'wrong_solve' });
      }
      sendState();
      break;
    }

    case 'mystery-choice': {
      if (info.role !== 'host') return;
      if (!game.mysteryPending) return;
      if (msg.choice === 'safe') {
        game.players[game.currentPlayer].roundEarnings += 1000;
        game.mysteryPending = false;
        game.phase = 'awaiting_action';
      } else if (msg.choice === 'flip') {
        // 50/50 chance
        if (Math.random() < 0.5) {
          game.players[game.currentPlayer].roundEarnings += 10000;
          broadcast({ type: 'event', event: 'mystery_win' });
        } else {
          game.players[game.currentPlayer].roundEarnings = 0;
          broadcast({ type: 'event', event: 'bankrupt' });
        }
        game.mysteryPending = false;
        game.phase = 'awaiting_action';
      }
      sendState();
      break;
    }

    case 'toss-up-buzz': {
      if (info.role !== 'host' && info.role !== 'player') return;
      if (game.phase !== 'toss_up' || !game.tossUp.buzzerOpen) return;
      // Players use their own ID; host passes a playerId
      const buzzPlayerId = info.role === 'player' ? info.playerId : (msg.playerId || null);
      if (!buzzPlayerId) return;
      game.tossUp.buzzedPlayer = buzzPlayerId;
      game.tossUp.buzzerOpen = false;
      if (tossUpRevealTimer) { clearInterval(tossUpRevealTimer); tossUpRevealTimer = null; }
      game.phase = 'toss_up_solve';
      sendState();
      break;
    }

    case 'toss-up-result': {
      if (info.role !== 'host') return;
      if (game.phase !== 'toss_up_solve') return;
      if (msg.correct) {
        // Award prize
        const pIdx = game.players.findIndex(p => p.id === game.tossUp.buzzedPlayer);
        if (pIdx >= 0) {
          game.players[pIdx].bank += game.tossUp.prize;
          game.currentPlayer = pIdx; // winner goes first
        }
        // Reveal full puzzle
        game.tossUp.revealedPositions = game.tossUp.puzzle.answer.split('').map((_, i) => i);
        broadcast({ type: 'event', event: 'toss_up_won', player: game.tossUp.buzzedPlayer });
        // Start next round after a beat
        setTimeout(() => {
          startMainRound(game.tossUpNumber);
          sendState();
        }, 2000);
      } else {
        // Wrong — resume reveals, re-open buzzer
        game.tossUp.buzzedPlayer = null;
        game.tossUp.buzzerOpen = true;
        game.phase = 'toss_up';
        startTossUpReveals();
      }
      sendState();
      break;
    }

    case 'skip-toss-up': {
      if (info.role !== 'host') return;
      if (tossUpRevealTimer) { clearInterval(tossUpRevealTimer); tossUpRevealTimer = null; }
      startMainRound(game.tossUpNumber);
      sendState();
      break;
    }

    case 'start-speed-round': {
      if (info.role !== 'host') return;
      startSpeedRound();
      sendState();
      break;
    }

    case 'start-bonus': {
      if (info.role !== 'host') return;
      startBonusRound();
      sendState();
      break;
    }

    case 'bonus-pick-letters': {
      if (info.role !== 'host') return;
      if (game.phase !== 'bonus_pick') return;
      const consonants = (msg.consonants || []).map(c => c.toUpperCase()).filter(c => CONSONANTS.includes(c));
      const vowel = (msg.vowel || '').toUpperCase();
      const neededConsonants = game.bonus.hasSkeletonKey ? 4 : 3;
      if (consonants.length !== neededConsonants || !VOWELS.includes(vowel)) return;
      if (game.bonus.hasSkeletonKey) {
        game.bonus.pickedConsonants = consonants.slice(0, 3);
        game.bonus.extraConsonant = consonants[3];
      } else {
        game.bonus.pickedConsonants = consonants;
      }
      game.bonus.pickedVowel = vowel;
      game.bonus.allRevealed = [...game.bonus.freeLetters, ...game.bonus.pickedConsonants, vowel];
      if (game.bonus.extraConsonant) game.bonus.allRevealed.push(game.bonus.extraConsonant);
      game.phase = 'bonus_reveal';
      sendState();
      break;
    }

    case 'bonus-start-timer': {
      if (info.role !== 'host') return;
      if (game.phase !== 'bonus_reveal') return;
      game.phase = 'bonus_solve';
      game.bonus.timerRunning = true;
      bonusTimer = setInterval(() => {
        game.bonus.timeRemaining--;
        if (game.bonus.timeRemaining <= 0) {
          clearInterval(bonusTimer);
          bonusTimer = null;
          game.bonus.timerRunning = false;
          game.bonus.solved = false;
          game.phase = 'bonus_result';
        }
        sendState();
      }, 1000);
      sendState();
      break;
    }

    case 'bonus-solve': {
      if (info.role !== 'host') return;
      if (game.phase !== 'bonus_solve') return;
      if (msg.correct) {
        if (bonusTimer) { clearInterval(bonusTimer); bonusTimer = null; }
        game.bonus.timerRunning = false;
        game.bonus.solved = true;
        game.players[game.bonus.player].bank += game.bonus.prize;
        game.phase = 'bonus_result';
        broadcast({ type: 'event', event: 'bonus_won', prize: game.bonus.prize });
      } else {
        // They can keep guessing until time runs out
        broadcast({ type: 'event', event: 'wrong_solve' });
      }
      sendState();
      break;
    }

    case 'bonus-end': {
      if (info.role !== 'host') return;
      game.phase = 'final_score';
      sendState();
      break;
    }

    case 'next-round': {
      if (info.role !== 'host') return;
      if (game.phase === 'round_won') {
        const nextRound = game.roundNumber + 1;
        if (nextRound <= 3) {
          startTossUp(nextRound);
        } else {
          game.phase = 'pre_bonus';
        }
      }
      sendState();
      break;
    }

    case 'reset': {
      if (info.role !== 'host') return;
      clearAllTimers();
      game = createGameState();
      sendState();
      break;
    }

    case 'adjust-score': {
      if (info.role !== 'host') return;
      const pi = game.players.findIndex(p => p.id === msg.playerId);
      if (pi >= 0) {
        if (msg.field === 'bank') game.players[pi].bank += (msg.amount || 0);
        if (msg.field === 'round') game.players[pi].roundEarnings += (msg.amount || 0);
      }
      sendState();
      break;
    }

    case 'set-puzzle': {
      if (info.role !== 'host') return;
      if (msg.category && msg.answer) {
        game.puzzle = { category: msg.category, answer: msg.answer.toUpperCase(), tier: 1, id: 'custom' };
        game.revealedLetters = [];
        game.calledLetters = [];
      }
      sendState();
      break;
    }

    case 'force-phase': {
      if (info.role !== 'host') return;
      game.phase = msg.phase;
      sendState();
      break;
    }
  }
}

// --- Game flow ---

function startTossUp(num) {
  game.tossUpNumber = num;
  game.tossUp.prize = num * 1000;
  game.tossUp.puzzle = selectTossUp();
  game.tossUp.revealedPositions = [];
  game.tossUp.buzzerOpen = true;
  game.tossUp.buzzedPlayer = null;
  game.phase = 'toss_up';
  startTossUpReveals();
}

function startTossUpReveals() {
  if (tossUpRevealTimer) clearInterval(tossUpRevealTimer);
  const answer = game.tossUp.puzzle.answer;
  // Get all letter positions (not spaces)
  const letterPositions = [];
  for (let i = 0; i < answer.length; i++) {
    if (/[A-Z]/.test(answer[i]) && !game.tossUp.revealedPositions.includes(i)) {
      letterPositions.push(i);
    }
  }
  // Shuffle
  for (let i = letterPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letterPositions[i], letterPositions[j]] = [letterPositions[j], letterPositions[i]];
  }
  let revealIdx = 0;
  tossUpRevealTimer = setInterval(() => {
    if (revealIdx >= letterPositions.length || game.phase !== 'toss_up') {
      clearInterval(tossUpRevealTimer);
      tossUpRevealTimer = null;
      // All revealed, auto-open buzzers for a final chance
      return;
    }
    game.tossUp.revealedPositions.push(letterPositions[revealIdx]);
    revealIdx++;
    sendState();
  }, 1500);
}

function startMainRound(roundNum) {
  game.roundNumber = roundNum;
  game.puzzle = selectPuzzle(roundNum <= 1 ? [1, 2] : [2, 3]);
  game.revealedLetters = [];
  game.calledLetters = [];
  game.lastSpin = null;
  game.mysteryPending = false;
  game.isPrizePuzzle = (roundNum === 3);

  // Reset round earnings
  for (const p of game.players) {
    p.roundEarnings = 0;
  }

  game.phase = 'awaiting_action';
  broadcast({ type: 'event', event: 'round_start', round: roundNum });
}

function processSpinResult(result) {
  const wedge = result.wedge;
  const player = game.players[game.currentPlayer];

  switch (wedge.type) {
    case 'cash':
      game.phase = 'awaiting_letter';
      break;
    case 'bankrupt':
      player.roundEarnings = 0;
      player.hasSkeletonKey = false;
      broadcast({ type: 'event', event: 'bankrupt', player: player.id });
      nextPlayer();
      game.phase = 'awaiting_action';
      break;
    case 'lose_turn':
      broadcast({ type: 'event', event: 'lose_turn', player: player.id });
      nextPlayer();
      game.phase = 'awaiting_action';
      break;
    case 'free_play':
      // Can call any letter free, no penalty for miss
      game.phase = 'awaiting_letter'; // host can pick consonant or vowel
      break;
    case 'mystery':
      // Must call a consonant first, then choose safe/flip if correct
      game.phase = 'awaiting_letter';
      break;
    case 'skeleton_key':
      player.hasSkeletonKey = true;
      broadcast({ type: 'event', event: 'skeleton_key', player: player.id });
      game.phase = 'awaiting_letter';
      break;
  }
}

function processLetter(letter) {
  game.calledLetters.push(letter);
  const answer = game.puzzle.answer;
  const count = countLetter(answer, letter);
  const wedge = game.lastSpin ? game.lastSpin.wedge : null;
  const player = game.players[game.currentPlayer];
  const isConsonant = CONSONANTS.includes(letter);
  const isVowel = VOWELS.includes(letter);

  if (game.phase === 'awaiting_vowel') {
    // Vowel was bought
    if (count > 0) {
      game.revealedLetters.push(letter);
      broadcast({ type: 'event', event: 'letter_hit', letter, count });
      if (isPuzzleSolved(answer, game.revealedLetters)) {
        solveCorrect();
        return;
      }
    } else {
      broadcast({ type: 'event', event: 'letter_miss', letter });
      // Vowel miss: lose turn, money already deducted
      nextPlayer();
    }
    game.phase = 'awaiting_action';
    return;
  }

  if (game.speedRound) {
    // Speed round: no spinning, fixed value per consonant, free vowels
    if (count > 0) {
      game.revealedLetters.push(letter);
      if (isConsonant) {
        player.roundEarnings += game.speedValue * count;
      }
      broadcast({ type: 'event', event: 'letter_hit', letter, count });
      if (isPuzzleSolved(answer, game.revealedLetters)) {
        if (speedTurnTimer) { clearInterval(speedTurnTimer); speedTurnTimer = null; }
        solveCorrect();
        return;
      }
      game.phase = 'awaiting_action';
      startSpeedTurnTimer(); // reset timer for next action
    } else {
      broadcast({ type: 'event', event: 'letter_miss', letter });
      nextPlayer();
      game.phase = 'awaiting_action';
      startSpeedTurnTimer(); // reset timer for next player
    }
    return;
  }

  // Normal spin result
  if (count > 0) {
    game.revealedLetters.push(letter);

    if (wedge && wedge.type === 'mystery') {
      // Correct on mystery — player chooses safe ($1000) or flip
      broadcast({ type: 'event', event: 'letter_hit', letter, count });
      game.mysteryPending = true;
      game.phase = 'mystery_choice';
      if (isPuzzleSolved(answer, game.revealedLetters)) {
        game.mysteryPending = false;
        solveCorrect();
      }
      return;
    }

    if (wedge && wedge.type === 'free_play') {
      // Free play: $500 per consonant found, vowels free
      if (isConsonant) {
        player.roundEarnings += 500 * count;
      }
      broadcast({ type: 'event', event: 'letter_hit', letter, count, value: isConsonant ? 500 * count : 0 });
    } else if (wedge && wedge.type === 'skeleton_key') {
      // Skeleton key wedge: earn $500 per letter as a base
      player.roundEarnings += 500 * count;
      broadcast({ type: 'event', event: 'letter_hit', letter, count });
    } else if (wedge && wedge.type === 'cash') {
      player.roundEarnings += wedge.value * count;
      broadcast({ type: 'event', event: 'letter_hit', letter, count, value: wedge.value * count });
    }

    if (isPuzzleSolved(answer, game.revealedLetters)) {
      solveCorrect();
      return;
    }
    game.phase = 'awaiting_action';
  } else {
    broadcast({ type: 'event', event: 'letter_miss', letter });
    if (wedge && wedge.type === 'free_play') {
      // Free play: no penalty for miss
      game.phase = 'awaiting_action';
    } else {
      nextPlayer();
      game.phase = 'awaiting_action';
    }
  }
}

function solveCorrect() {
  const player = game.players[game.currentPlayer];
  player.bank += player.roundEarnings;
  // Reveal all letters
  game.revealedLetters = game.puzzle.answer.split('').filter(ch => /[A-Z]/.test(ch));
  game.mysteryPending = false;

  broadcast({ type: 'event', event: 'puzzle_solved', player: player.id, earnings: player.roundEarnings });
  game.phase = 'round_won';
}

function startSpeedRound() {
  const result = spinWheel();
  game.speedRound = true;
  game.speedValue = (result.wedge.type === 'cash' ? result.wedge.value : 500) + 1000;
  game.speedTurnTimer = 5;
  game.puzzle = selectPuzzle([2, 3]);
  game.revealedLetters = [];
  game.calledLetters = [];
  for (const p of game.players) p.roundEarnings = 0;
  game.phase = 'awaiting_action';
  broadcast({ type: 'event', event: 'speed_round', value: game.speedValue });
  startSpeedTurnTimer();
}

function startSpeedTurnTimer() {
  if (speedTurnTimer) { clearInterval(speedTurnTimer); speedTurnTimer = null; }
  game.speedTurnTimer = 5;
  speedTurnTimer = setInterval(() => {
    game.speedTurnTimer--;
    if (game.speedTurnTimer <= 0) {
      clearInterval(speedTurnTimer);
      speedTurnTimer = null;
      // Time's up — pass turn
      broadcast({ type: 'event', event: 'speed_timeout', player: game.players[game.currentPlayer]?.id });
      nextPlayer();
      game.phase = 'awaiting_action';
      game.speedTurnTimer = 5;
      startSpeedTurnTimer();
    }
    sendState();
  }, 1000);
}

function startBonusRound() {
  // Player with highest bank plays bonus
  let maxBank = -1;
  let bonusPlayer = 0;
  game.players.forEach((p, i) => {
    if (p.bank > maxBank) { maxBank = p.bank; bonusPlayer = i; }
  });

  game.bonus.active = true;
  game.bonus.player = bonusPlayer;
  game.bonus.puzzle = selectBonusPuzzle();
  game.bonus.pickedConsonants = [];
  game.bonus.pickedVowel = null;
  game.bonus.extraConsonant = null;
  game.bonus.timeRemaining = 10;
  game.bonus.timerRunning = false;
  game.bonus.solved = null;
  game.bonus.hasSkeletonKey = game.players[bonusPlayer].hasSkeletonKey;

  // Spin bonus wheel for prize
  const prizeIdx = Math.floor(Math.random() * BONUS_PRIZES.length);
  game.bonus.prize = BONUS_PRIZES[prizeIdx];

  game.phase = 'bonus_pick';
  broadcast({ type: 'event', event: 'bonus_start', player: game.players[bonusPlayer].name, prize: game.bonus.prize });
}

// --- Start server ---

server.listen(PORT, () => {
  console.log(`Hacker Wheel of Fortune server running on http://localhost:${PORT}`);
  console.log(`  Host:   http://localhost:${PORT}/host.html`);
  console.log(`  Board:  http://localhost:${PORT}/board.html`);
  console.log(`  Player: http://localhost:${PORT}/player.html`);
});
