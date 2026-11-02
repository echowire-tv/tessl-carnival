import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_MOLE = 10;
export const HOLE_RADIUS = 48;
const COLUMNS = [200, 400, 600];
const ROWS = [140, 260, 380];
/** Seconds between moles at the start of the round, and at the end. */
const SPAWN_START = 1.0;
const SPAWN_END = 0.35;
/** Seconds a mole stays up at the start of the round, and at the end. */
const UP_START = 1.3;
const UP_END = 0.6;

export interface Hole {
  x: number;
  y: number;
  /** Seconds left before the mole drops back down; 0 when the hole is empty. */
  up: number;
}

export interface Bonk {
  x: number;
  y: number;
  age: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  bonks: Bonk[];
  /** Seconds since the round started. */
  elapsed: number;
  /** Seconds until the next mole pops up. */
  nextMole: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes = ROWS.flatMap((y) => COLUMNS.map((x) => ({ x, y, up: 0 })));
  return { holes, bonks: [], elapsed: 0, nextMole: 0.5, score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 to 1. */
function progress(elapsed: number): number {
  return Math.min(Math.max(elapsed / ROUND_SECONDS, 0), 1);
}

/** Seconds between moles: 1 s at the start of the round, down to 0.35 s at the end. */
export function spawnInterval(elapsed: number): number {
  return SPAWN_START + (SPAWN_END - SPAWN_START) * progress(elapsed);
}

/** Seconds a mole stays up: 1.3 s at the start of the round, down to 0.6 s at the end. */
export function upTime(elapsed: number): number {
  return UP_START + (UP_END - UP_START) * progress(elapsed);
}

export function timeLeft(state: WhackAMoleState): number {
  return Math.max(ROUND_SECONDS - state.elapsed, 0);
}

/** The hole under the point, or undefined if the point misses every hole. */
export function holeAt(state: WhackAMoleState, x: number, y: number): Hole | undefined {
  return state.holes.find((hole) => Math.hypot(x - hole.x, y - hole.y) <= HOLE_RADIUS);
}

/** Whacks whatever is at the point. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = holeAt(state, x, y);
  if (!hole || hole.up <= 0) return false;
  hole.up = 0;
  state.score += POINTS_PER_MOLE;
  state.bonks.push({ x: hole.x, y: hole.y, age: 0 });
  return true;
}

/**
 * Advances the game by `dt` seconds. `random` picks which empty hole the next
 * mole pops up from; tests can pass their own.
 */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  for (const bonk of state.bonks) bonk.age += dt;
  state.bonks = state.bonks.filter((b) => b.age < 0.3);

  if (state.phase !== 'playing') return;

  state.elapsed += dt;
  if (state.elapsed >= ROUND_SECONDS) {
    state.elapsed = ROUND_SECONDS;
    for (const hole of state.holes) hole.up = 0;
    state.phase = 'over';
    return;
  }

  for (const hole of state.holes) hole.up = Math.max(hole.up - dt, 0);

  state.nextMole -= dt;
  if (state.nextMole <= 0) {
    const empty = state.holes.filter((hole) => hole.up <= 0);
    if (empty.length > 0) {
      const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
      hole.up = upTime(state.elapsed);
    }
    state.nextMole += spawnInterval(state.elapsed);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The table the holes are cut into.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(80, 70, WIDTH - 160, 380);

  for (const hole of state.holes) {
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 20, HOLE_RADIUS, HOLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0) {
      // The mole: a round head poking out of the hole.
      ctx.fillStyle = colors.muted;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, HOLE_RADIUS * 0.7, Math.PI, 0);
      ctx.lineTo(hole.x + HOLE_RADIUS * 0.7, hole.y + 20);
      ctx.lineTo(hole.x - HOLE_RADIUS * 0.7, hole.y + 20);
      ctx.fill();
      ctx.fillStyle = colors.background;
      ctx.beginPath();
      ctx.arc(hole.x - 12, hole.y - 10, 4, 0, Math.PI * 2);
      ctx.arc(hole.x + 12, hole.y - 10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.stripeA;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y + 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  for (const bonk of state.bonks) {
    ctx.globalAlpha = 1 - bonk.age / 0.3;
    ctx.beginPath();
    ctx.arc(bonk.x, bonk.y - 10, 20 + bonk.age * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(timeLeft(state))}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get quicker as the clock runs.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
