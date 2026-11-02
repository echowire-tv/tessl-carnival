import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  SWAY_AMPLITUDE,
  SWAY_SPEED,
  THROWER,
  bottleAt,
  createState,
  step,
  sway,
  toss,
} from './game';

/** Throws at a point with no sway, and lets the ring land. */
function tossAndLand(state: ReturnType<typeof createState>, x: number, y: number) {
  state.time = 0;
  toss(state, x, y);
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('starts with a full set of rings, no score and three rows of bottles', () => {
    const state = createState();
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(new Set(state.bottles.map((b) => b.y)).size).toBe(3);
    expect(state.bottles.some((b) => b.ringed)).toBe(false);
  });

  it('uses one ring per toss', () => {
    const state = createState();
    expect(toss(state, 400, 100)).toBe(true);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
    expect(state.rings).toHaveLength(1);
  });

  it('cannot toss once the rings run out', () => {
    const state = createState();
    state.ringsLeft = 0;
    expect(toss(state, 400, 100)).toBe(false);
    expect(state.rings).toHaveLength(0);
  });

  it('never throws a ring behind the player', () => {
    const state = createState();
    toss(state, 400, THROWER.y + 100);
    expect(state.rings[0].toY).toBeLessThan(THROWER.y);
  });

  it('pushes the ring sideways by the sway of the hand', () => {
    const state = createState();
    state.time = Math.PI / 2 / SWAY_SPEED;
    expect(sway(state)).toBeCloseTo(SWAY_AMPLITUDE);
    toss(state, 400, 100);
    expect(state.rings[0].toX).toBeCloseTo(400 + SWAY_AMPLITUDE);
  });

  it('scores a ring that lands on a bottle neck, once it lands', () => {
    const state = createState();
    const [bottle] = state.bottles;
    state.time = 0;
    toss(state, bottle.x + NECK_RADIUS - 1, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringed).toBe(true);
    expect(state.rings).toHaveLength(0);
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    tossAndLand(state, 5, 100);
    expect(state.score).toBe(0);
    expect(state.misses).toHaveLength(1);
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const rows = [...new Set(state.bottles.map((b) => b.y))].sort((a, b) => a - b);
    const points = rows.map((y) => state.bottles.find((b) => b.y === y)!.points);
    expect(points).toEqual([30, 20, 10]);
  });

  it('lets a ring bounce off a bottle that already has one', () => {
    const state = createState();
    const [bottle] = state.bottles;
    tossAndLand(state, bottle.x, bottle.y);
    tossAndLand(state, bottle.x, bottle.y);
    expect(state.score).toBe(bottle.points);
  });

  it('finds the bottle under a landing point, and none away from the necks', () => {
    const state = createState();
    const [bottle] = state.bottles;
    expect(bottleAt(state, bottle.x, bottle.y + NECK_RADIUS)).toBe(bottle);
    expect(bottleAt(state, bottle.x, bottle.y + NECK_RADIUS + 1)).toBeUndefined();
  });

  it('ends the round when the rings run out and the last ring has landed', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) toss(state, 400, 100);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('over');
  });
});
