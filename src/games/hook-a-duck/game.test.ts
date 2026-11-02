import { describe, expect, it } from 'vitest';
import {
  AWAY_TIME,
  CASTS,
  CATCH_RADIUS,
  DROP_TIME,
  DUCK_NUMBERS,
  DUCK_SPEED,
  RAISE_TIME,
  cast,
  createState,
  duckPosition,
  duckUnderHook,
  step,
  type HookADuckState,
} from './game';

/** A state with a single duck that stays still, so a cast can aim at it. */
function oneDuck(number = 50): HookADuckState {
  const state = createState();
  state.ducks = [{ angle: 0, number, away: 0 }];
  return state;
}

/** Where a duck at `angle` will be once a cast made now reaches the water. */
function whereItWillBe(angle: number) {
  return duckPosition({ angle: angle + DUCK_SPEED * DROP_TIME, number: 0, away: 0 });
}

describe('hook a duck', () => {
  it('starts with every cast left, no score and a duck for each number', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.number)).toEqual([...DUCK_NUMBERS]);
  });

  it('floats the ducks round the stream in a loop', () => {
    const state = oneDuck();
    const start = duckPosition(state.ducks[0]);
    step(state, 1);
    expect(duckPosition(state.ducks[0])).not.toEqual(start);
    step(state, (Math.PI * 2) / DUCK_SPEED - 1);
    const back = duckPosition(state.ducks[0]);
    expect(back.x).toBeCloseTo(start.x);
    expect(back.y).toBeCloseTo(start.y);
  });

  it('uses one cast each time the hook goes down', () => {
    const state = createState();
    expect(cast(state, 400, 250)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook).not.toBeNull();
  });

  it('cannot cast again while the hook is still down', () => {
    const state = createState();
    cast(state, 400, 250);
    expect(cast(state, 400, 250)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts run out', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, 400, 250)).toBe(false);
    expect(state.hook).toBeNull();
  });

  it('scores the number on a duck the hook lands on', () => {
    const state = oneDuck(50);
    const { x, y } = whereItWillBe(0);
    cast(state, x, y);
    step(state, DROP_TIME);
    expect(state.score).toBe(50);
    expect(state.ducks[0].away).toBe(AWAY_TIME);
  });

  it('scores nothing when the hook lands in open water', () => {
    const state = oneDuck(50);
    const { x, y } = whereItWillBe(0);
    cast(state, x + CATCH_RADIUS + 5, y);
    step(state, DROP_TIME);
    expect(state.score).toBe(0);
    expect(state.ducks[0].away).toBe(0);
  });

  it('catches only where the duck is when the hook reaches the water', () => {
    const state = oneDuck(50);
    const now = duckPosition(state.ducks[0]);
    state.ducks[0].angle = Math.PI / 2;
    cast(state, now.x, now.y);
    step(state, DROP_TIME);
    expect(state.score).toBe(0);
  });

  it('cannot catch a duck that is out of the stream', () => {
    const state = oneDuck(50);
    state.ducks[0].away = AWAY_TIME;
    const { x, y } = duckPosition(state.ducks[0]);
    expect(duckUnderHook(state, x, y)).toBeUndefined();
  });

  it('catches the closest duck when two are in reach', () => {
    const state = createState();
    state.ducks = [
      { angle: 0, number: 10, away: 0 },
      { angle: 0.05, number: 100, away: 0 },
    ];
    const { x, y } = duckPosition(state.ducks[1]);
    expect(duckUnderHook(state, x, y)?.number).toBe(100);
  });

  it('ends the round once the last cast has come back up', () => {
    const state = oneDuck();
    state.casts = 1;
    cast(state, 0, 0);
    step(state, DROP_TIME);
    expect(state.phase).toBe('playing');
    step(state, RAISE_TIME);
    expect(state.hook).toBeNull();
    expect(state.phase).toBe('over');
  });

  it('cannot cast after the round is over', () => {
    const state = createState();
    state.phase = 'over';
    expect(cast(state, 400, 250)).toBe(false);
  });
});
