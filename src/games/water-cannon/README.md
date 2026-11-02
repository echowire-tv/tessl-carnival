# Water Cannon

Soak the targets on the three rails before your tank runs dry.

## How to play

- Move the mouse to aim the cannon, and click to fire a shot of water.
- You have 15 shots. The game ends when the tank is empty and the last shot has landed.
- Click again on the game over screen to play another round.

## Scoring

Each target scores 10 points for every 60 px/s of speed, rounded up:

| Rail   | Speed    | Points |
| ------ | -------- | ------ |
| Top    | 180 px/s | 30     |
| Middle | 120 px/s | 20     |
| Bottom | 60 px/s  | 10     |

Now and then a target on the top rail turns gold. Each time a top-rail target
goes back to the start of its rail, after being soaked or after wrapping off
screen, it has a 1 in 5 chance to turn gold. Only one target is golden at a
time, and targets on the middle and bottom rails never turn gold. Soaking a
golden target scores 10x its normal points: 300 instead of 30. It stays gold
until it is soaked or wraps off screen. Then it goes back to normal and rolls
the same 1 in 5 chance as any other top-rail target going back to the start,
so it can come straight back gold.

Your final score is saved to the carnival's score board when the game ends.

## Options

Add `?shots=25` to the page URL to change the size of the tank, for example
`http://localhost:5173/?shots=25#/play/water-cannon`.

## Files

- `game.ts`: the game logic (`createState`, `fire`, `step`, `scoreForHit`,
  `returnToStart`) and the
  `waterCannon` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
