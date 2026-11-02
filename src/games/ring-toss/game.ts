import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air before it lands. */
export const FLIGHT_TIME = 0.6;
/** How close to the centre of a bottle neck a ring has to land to go over it. */
export const NECK_RADIUS = 14;
/** The throwing hand sways left and right, so the ring lands off the aim. */
export const SWAY_AMPLITUDE = 30;
export const SWAY_SPEED = 2.5;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
/** Back row first. Bottles further back are smaller and score more. */
const ROWS = [
  { y: 130, points: 30, scale: 0.7 },
  { y: 200, points: 20, scale: 0.85 },
  { y: 270, points: 10, scale: 1 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  x: number;
  y: number;
  points: number;
  scale: number;
  /** A bottle holds one ring. Another ring on it bounces off. */
  ringed: boolean;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface Miss {
  x: number;
  y: number;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  rings: Ring[];
  misses: Miss[];
  ringsLeft: number;
  score: number;
  /** Seconds since the round started; drives the sway. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 110;
  const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      points: row.points,
      scale: row.scale,
      ringed: false,
    })),
  );
  return {
    bottles,
    rings: [],
    misses: [],
    ringsLeft: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** How far the hand has swayed sideways at this moment, in pixels. */
export function sway(state: RingTossState): number {
  return SWAY_AMPLITUDE * Math.sin(state.time * SWAY_SPEED);
}

/** The bottle whose neck a ring landing at (x, y) goes over, if any. */
export function bottleAt(state: RingTossState, x: number, y: number): Bottle | undefined {
  return state.bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/**
 * Throws one ring towards the aim point, pushed sideways by the sway.
 * Returns false if nothing was thrown.
 */
export function toss(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ringsLeft === 0) return false;
  state.rings.push({
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + sway(state),
    toY: Math.min(aimY, THROWER.y - 1),
    age: 0,
  });
  state.ringsLeft -= 1;
  return true;
}

/** Lands a ring: it scores on a free bottle neck and misses anywhere else. */
export function land(state: RingTossState, ring: Ring): void {
  const bottle = bottleAt(state, ring.toX, ring.toY);
  if (bottle && !bottle.ringed) {
    bottle.ringed = true;
    state.score += bottle.points;
  } else {
    state.misses.push({ x: ring.toX, y: ring.toY, age: 0 });
  }
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  for (const miss of state.misses) miss.age += dt;
  state.misses = state.misses.filter((m) => m.age < 0.5);

  const flying: Ring[] = [];
  for (const ring of state.rings) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) land(state, ring);
    else flying.push(ring);
  }
  state.rings = flying;

  if (state.ringsLeft === 0 && state.rings.length === 0) state.phase = 'over';
}

/** Where a ring is in the air: a straight line with a hop, shrinking as it goes. */
function ringPosition(ring: Ring) {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(t * Math.PI) * 80,
    scale: 1.4 - 0.6 * t,
  };
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, 18 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Shelves under each row of bottles.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(40, row.y + 40 * row.scale, WIDTH - 80, 8);
  }

  for (const bottle of state.bottles) {
    const s = bottle.scale;
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 14 * s, bottle.y + 6 * s, 28 * s, 34 * s);
    ctx.fillRect(bottle.x - 6 * s, bottle.y - 10 * s, 12 * s, 18 * s);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(bottle.x - 7 * s, bottle.y - 14 * s, 14 * s, 5 * s);
    if (bottle.ringed) drawRing(ctx, bottle.x, bottle.y + 4 * s, s);
  }

  ctx.strokeStyle = colors.danger;
  ctx.lineWidth = 3;
  for (const miss of state.misses) {
    ctx.globalAlpha = 1 - miss.age / 0.5;
    ctx.beginPath();
    ctx.ellipse(miss.x, miss.y, 18 + miss.age * 30, 7 + miss.age * 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const ring of state.rings) {
    const { x, y, scale } = ringPosition(ring);
    drawRing(ctx, x, y, scale);
  }

  if (state.phase === 'playing') {
    // Where a ring thrown now would land.
    const x = aim.x + sway(state);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, aim.y);
    ctx.lineTo(x + 10, aim.y);
    ctx.moveTo(x, aim.y - 10);
    ctx.lineTo(x, aim.y + 10);
    ctx.stroke();
    if (state.ringsLeft > 0) drawRing(ctx, THROWER.x, THROWER.y, 1.4);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.ringsLeft}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings over the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 2 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
