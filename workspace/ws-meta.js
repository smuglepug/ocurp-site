/* Shared catalogue metadata: genre/category colours, game genres, featured picks. */
window.WS_META = (function () {
  var GAME_GROUPS = {
    arcade:   { label: 'Arcade',        c: '#5ec8ff' },
    puzzle:   { label: 'Puzzle',        c: '#b49bff' },
    board:    { label: 'Board & cards', c: '#4fd69c' },
    strategy: { label: 'Strategy',      c: '#ff8fc7' },
    brain:    { label: 'Words & brain', c: '#ffd166' },
    skill:    { label: 'Reflex',        c: '#ff7a8a' },
    sim:      { label: 'Sims & toys',   c: '#43e0d0' }
  };
  var G = {
    arcade: 'snake breakout pong tetris asteroids flappy-bird space-invaders fruit-slice lane-runner mole-mash tower-stack tron-arena orbit-defender river-crosser snake-battle missile-command pinball platformer bomberman-lite breakout-2p drone-dash doodle-jump moon-lander plinko-drop slingshot-siege ricochet-rings ricochet-lines deep-descent orbit-race',
    puzzle: '2048 minesweeper sudoku lights-out hexmines nonogram sokoban sliding-puzzle peg-solitaire mines-digger towers kenken circuit-balance orbit-fit path-forge grid-trail memory-match tile-memory',
    board: 'chess checkers reversi connect-four tic-tac-toe gomoku nim battleship dots-boxes blackjack freecell holdem yahtzee dominoes ludo snakes-ladders tic-tac-toe-3d ultimate-ttt hexxagon chomp rock-paper-scissors mastermind',
    strategy: 'kingdom-builder grid-tactics tower-defense spend-a-billion',
    brain: 'wordle hangman boggle word-search word-ladder typing-race math-sprint memory-sequence simon password-gauntlet life-in-numbers',
    skill: 'aim-trainer reaction-time fitts-drill circle-score',
    sim: 'falling-sand sandbox-3d jepa-lab n-body-orbits pendulum-lab reaction-diffusion wave-equation meme-sound-generator'
  };
  var gameOf = {};
  Object.keys(G).forEach(function (k) { G[k].split(' ').forEach(function (s) { gameOf[s] = k; }); });

  var TOOL_GROUPS = {
    data:     { label: 'Data & code',      c: '#5ec8ff' },
    dev:      { label: 'Developer',        c: '#7aa2ff' },
    document: { label: 'PDF & docs',       c: '#ff8f70' },
    text:     { label: 'Writing & text',   c: '#ffd166' },
    design:   { label: 'Design & colour',  c: '#ff8fc7' },
    math:     { label: 'Math & convert',   c: '#b49bff' },
    science:  { label: 'Science',          c: '#43e0d0' },
    web:      { label: 'Network & web',    c: '#6ee7b7' },
    security: { label: 'Security',         c: '#4fd69c' },
    audio:    { label: 'Audio & speech',   c: '#f0abfc' },
    study:    { label: 'Study & career',   c: '#fcd34d' },
    health:   { label: 'Health',           c: '#fb7185' },
    fun:      { label: 'Fun',              c: '#fdba74' }
  };
  return {
    v: '20261006',
    groups: function (kind) { return kind === 'games' ? GAME_GROUPS : TOOL_GROUPS; },
    group: function (kind, e) { return kind === 'games' ? (gameOf[e.slug] || 'arcade') : (TOOL_GROUPS[e.cat] ? e.cat : 'data'); },
    featured: {
      games: ['tetris', 'asteroids', 'chess'],
      tools: ['json-formatter', 'qr-code-generator', 'image-compress']
    }
  };
})();
