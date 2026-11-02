import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 8;
/** The stream is an oval loop the ducks float round. */
export const STREAM = { x: WIDTH / 2, y: 250, rx: 300, ry: 140 } as const;
/** Radians per second each duck moves round the loop. */
export const DUCK_SPEED = 0.6;
/** Seconds the hook takes to reach the water, and to come back up. */
export const DROP_TIME = 0.5;
export const RAISE_TIME = 0.4;
/** How close to a duck the hook has to land to catch it, in pixels. */
export const CATCH_RADIUS = 26;
/** Seconds a caught duck is out of the stream before it floats back. */
export const AWAY_TIME = 2;
/** The number on each duck's base, in the order they float. */
export const DUCK_NUMBERS = [10, 20, 10, 50, 10, 20, 10, 100] as const;
/** Where the rod is held, at the front of the booth. */
const ROD_BASE = { x: WIDTH / 2, y: HEIGHT + 20 } as const;

export interface Duck {
  /** Where the duck is round the loop, in radians. */
  angle: number;
  /** What the duck scores when caught. */
  number: number;
  /** Seconds until a caught duck is back in the stream; 0 when it is floating. */
  away: number;
}

export interface Hook {
  x: number;
  y: number;
  /** Seconds since the cast. */
  time: number;
  /** True once the hook has reached the water and tried to catch a duck. */
  landed: boolean;
}

export interface Catch {
  x: number;
  y: number;
  number: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook | null;
  catches: Catch[];
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_NUMBERS.map((number, i) => ({
    angle: (i / DUCK_NUMBERS.length) * Math.PI * 2,
    number,
    away: 0,
  }));
  return { ducks, hook: null, catches: [], casts: CASTS, score: 0, phase: 'playing' };
}

export function duckPosition(duck: Duck): { x: number; y: number } {
  return {
    x: STREAM.x + Math.cos(duck.angle) * STREAM.rx,
    y: STREAM.y + Math.sin(duck.angle) * STREAM.ry,
  };
}

/** The floating duck closest to the point, if one is within reach of the hook. */
export function duckUnderHook(state: HookADuckState, x: number, y: number): Duck | undefined {
  let best: Duck | undefined;
  let bestDistance = CATCH_RADIUS;
  for (const duck of state.ducks) {
    if (duck.away > 0) continue;
    const position = duckPosition(duck);
    const distance = Math.hypot(position.x - x, position.y - y);
    if (distance <= bestDistance) {
      best = duck;
      bestDistance = distance;
    }
  }
  return best;
}

/** Lowers the hook towards the point. Returns false if the hook can't be cast. */
export function cast(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.hook) return false;
  state.hook = { x, y, time: 0, landed: false };
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    duck.angle = (duck.angle + DUCK_SPEED * dt) % (Math.PI * 2);
    duck.away = Math.max(0, duck.away - dt);
  }

  const hook = state.hook;
  if (hook) {
    hook.time += dt;
    if (!hook.landed && hook.time >= DROP_TIME) {
      hook.landed = true;
      const duck = duckUnderHook(state, hook.x, hook.y);
      if (duck) {
        state.score += duck.number;
        state.catches.push({ ...duckPosition(duck), number: duck.number, age: 0 });
        duck.away = AWAY_TIME;
      }
    }
    if (hook.time >= DROP_TIME + RAISE_TIME) state.hook = null;
  }

  for (const caught of state.catches) caught.age += dt;
  state.catches = state.catches.filter((c) => c.age < 1);

  if (state.casts === 0 && !state.hook) state.phase = 'over';
}

/** How far down the hook is, from 0 (up at the rod) to 1 (in the water). */
function hookDepth(hook: Hook): number {
  if (hook.time < DROP_TIME) return hook.time / DROP_TIME;
  return Math.max(0, 1 - (hook.time - DROP_TIME) / RAISE_TIME);
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, number: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 12, y - 14, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + 20, y - 17);
  ctx.lineTo(x + 30, y - 13);
  ctx.lineTo(x + 20, y - 10);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + 14, y - 17, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText(String(number), x - 4, y + 5);
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream: a ring of water round a wooden island.
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 50, STREAM.ry + 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.water;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 40, STREAM.ry + 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 40, STREAM.ry - 40, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const duck of state.ducks) {
    if (duck.away > 0) continue;
    const { x, y } = duckPosition(duck);
    drawDuck(ctx, x, y, duck.number);
  }

  // The rod and line. The hook follows the aim until it is cast.
  const hook = state.hook;
  const target = hook ?? aim;
  const depth = hook ? hookDepth(hook) : 0;
  const tip = { x: target.x, y: target.y - 80 };
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(ROD_BASE.x, ROD_BASE.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  const hookY = tip.y + 20 + (target.y - tip.y - 20) * depth;
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x, hookY);
  ctx.stroke();
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(tip.x - 5, hookY, 5, 0, Math.PI);
  ctx.stroke();
  if (!hook) {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, CATCH_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.font = canvasFont('title', 'bold');
  ctx.textAlign = 'center';
  for (const caught of state.catches) {
    ctx.globalAlpha = 1 - caught.age;
    ctx.fillStyle = colors.accent;
    ctx.fillText(`+${caught.number}`, caught.x, caught.y - 30 - caught.age * 40);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Hook the rubber ducks as they float round the stream. Each duck scores its number.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y + STREAM.ry };

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
        cast(state, aim.x, aim.y);
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
        recordScore(hookADuck.id, state.score);
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

export default hookADuck;
