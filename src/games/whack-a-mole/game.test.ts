import { describe, expect, it } from 'vitest';
import {
  POINTS_PER_MOLE,
  ROUND_SECONDS,
  createState,
  spawnInterval,
  step,
  timeLeft,
  upTime,
  whack,
} from './game';

describe('whack-a-mole', () => {
  it('starts with no score, a full clock and every mole down', () => {
    const state = createState();
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(timeLeft(state)).toBe(ROUND_SECONDS);
    expect(state.holes).toHaveLength(9);
    expect(state.holes.every((hole) => hole.up === 0)).toBe(true);
  });

  it('pops a mole up from an empty hole when the next mole is due', () => {
    const state = createState();
    state.nextMole = 0.1;
    step(state, 0.1, () => 0);
    expect(state.holes[0].up).toBeGreaterThan(0);
    expect(state.holes.filter((hole) => hole.up > 0)).toHaveLength(1);
  });

  it('drops a mole back down once its time is up', () => {
    const state = createState();
    state.nextMole = 100;
    state.holes[4].up = 0.5;
    step(state, 0.6);
    expect(state.holes[4].up).toBe(0);
  });

  it('scores a whack on a mole that is up, and puts it down', () => {
    const state = createState();
    const hole = state.holes[4];
    hole.up = 1;
    expect(whack(state, hole.x + 10, hole.y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(hole.up).toBe(0);
  });

  it('scores nothing for an empty hole or a miss', () => {
    const state = createState();
    const hole = state.holes[4];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    hole.up = 1;
    expect(whack(state, 0, 0)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('cannot score the same mole twice', () => {
    const state = createState();
    const hole = state.holes[0];
    hole.up = 1;
    whack(state, hole.x, hole.y);
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_MOLE);
  });

  it('pops moles up more often, and for less time, as the round goes on', () => {
    expect(spawnInterval(ROUND_SECONDS)).toBeLessThan(spawnInterval(0));
    expect(upTime(ROUND_SECONDS)).toBeLessThan(upTime(0));
    expect(spawnInterval(ROUND_SECONDS / 2)).toBeLessThan(spawnInterval(0));
  });

  it('ends the round when the clock runs out', () => {
    const state = createState();
    state.holes[0].up = 1;
    state.elapsed = ROUND_SECONDS - 0.01;
    step(state, 0.05);
    expect(state.phase).toBe('over');
    expect(timeLeft(state)).toBe(0);
    expect(state.holes[0].up).toBe(0);
  });

  it('cannot score once the round is over', () => {
    const state = createState();
    const hole = state.holes[0];
    hole.up = 1;
    state.phase = 'over';
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
