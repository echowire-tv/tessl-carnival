import { describe, expect, it } from 'vitest';
import {
  CANNON,
  TANK_SIZE,
  createState,
  fire,
  isHit,
  scoreForHit,
  step,
  type Target,
} from './game';

const target: Target = { x: 400, y: 200, radius: 28, speed: 120 };

describe('water cannon', () => {
  it('starts with a full tank and no score', () => {
    const state = createState();
    expect(state.tank).toBe(TANK_SIZE);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('uses one shot of water per fire', () => {
    const state = createState();
    expect(fire(state, 400, 0)).toBe(true);
    expect(state.tank).toBe(TANK_SIZE - 1);
    expect(state.shots).toHaveLength(1);
  });

  it('cannot fire once the tank is empty', () => {
    const state = createState();
    state.tank = 0;
    expect(fire(state, 400, 0)).toBe(false);
    expect(state.shots).toHaveLength(0);
  });

  it('never fires downwards, even when aimed below the cannon', () => {
    const state = createState();
    fire(state, CANNON.x + 100, CANNON.y + 100);
    expect(state.shots[0].vy).toBeLessThan(0);
  });

  it('scores a hit and sends the target back to the start of its rail', () => {
    const state = createState();
    state.targets = [{ ...target }];
    state.shots = [{ x: target.x, y: target.y + 5, vx: 0, vy: 0 }];
    step(state, 0);
    expect(state.score).toBe(scoreForHit(target));
    expect(state.shots).toHaveLength(0);
    expect(state.targets[0].x).toBeLessThan(0);
  });

  it('ends the game when the tank is empty and the last shot has landed', () => {
    const state = createState();
    state.tank = 0;
    state.shots = [{ x: 10, y: -20, vx: 0, vy: -700 }];
    step(state, 0.1);
    expect(state.phase).toBe('over');
  });

  it('keeps playing while a shot is still in the air', () => {
    const state = createState();
    state.targets = [];
    state.tank = 0;
    state.shots = [{ x: 400, y: 300, vx: 0, vy: -700 }];
    step(state, 0.1);
    expect(state.phase).toBe('playing');
  });

  it('detects a hit inside the target and a miss outside it', () => {
    expect(isHit({ x: 410, y: 210, vx: 0, vy: 0 }, target)).toBe(true);
    expect(isHit({ x: 460, y: 200, vx: 0, vy: 0 }, target)).toBe(false);
  });

  it('scores a fast target higher than a slow one', () => {
    const slow = scoreForHit({ ...target, speed: 60 });
    const fast = scoreForHit({ ...target, speed: -180 });
    expect(Math.max(fast, slow)).toBeGreaterThanOrEqual(slow);
  });

  describe('golden targets', () => {
    const always = () => 0;
    const never = () => 0.99;
    const topRail = (state: ReturnType<typeof createState>) =>
      state.targets.filter((t) => t.y === state.targets[0].y);

    it('starts with no golden targets', () => {
      expect(createState().targets.some((t) => t.golden)).toBe(false);
    });

    it('turns a top-rail target gold when it wraps back to the start, 1 time in 5', () => {
      const state = createState();
      const [top] = topRail(state);
      state.targets = [top];
      top.x = 2000;
      step(state, 0, () => 0.19);
      expect(top.golden).toBe(true);

      const missed = createState();
      const [other] = topRail(missed);
      missed.targets = [other];
      other.x = 2000;
      step(missed, 0, () => 0.2);
      expect(other.golden).toBe(false);
    });

    it('turns a top-rail target gold when it is soaked', () => {
      const state = createState();
      const [top] = topRail(state);
      state.targets = [top];
      state.shots = [{ x: top.x, y: top.y, vx: 0, vy: 0 }];
      step(state, 0, always);
      expect(top.golden).toBe(true);
    });

    it('never turns a middle or bottom rail target gold', () => {
      const state = createState();
      const lower = state.targets.filter((t) => t.y !== state.targets[0].y);
      state.targets = lower;
      for (const t of lower) t.x = t.speed > 0 ? 2000 : -2000;
      step(state, 0, always);
      expect(lower.some((t) => t.golden)).toBe(false);
    });

    it('allows only one golden target at a time', () => {
      const state = createState();
      state.targets = topRail(state);
      for (const t of state.targets) t.x = 2000;
      step(state, 0, always);
      expect(state.targets.filter((t) => t.golden)).toHaveLength(1);
    });

    it('scores 10x for a golden target and then goes back to normal', () => {
      const state = createState();
      const [top] = topRail(state);
      const normal = scoreForHit(top);
      top.golden = true;
      expect(scoreForHit(top)).toBe(normal * 10);
      state.targets = [top];
      state.shots = [{ x: top.x, y: top.y, vx: 0, vy: 0 }];
      step(state, 0, never);
      expect(state.score).toBe(300);
      expect(top.golden).toBe(false);
    });

    it('stops being gold when it wraps off screen', () => {
      const state = createState();
      const [top] = topRail(state);
      top.golden = true;
      state.targets = [top];
      top.x = 2000;
      step(state, 0, never);
      expect(top.golden).toBe(false);
    });
  });
});
