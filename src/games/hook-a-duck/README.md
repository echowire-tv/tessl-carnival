# Hook a Duck

Rubber ducks float round a stream in a loop. Lower the hook to catch one as it
passes.

## How to play

- Move the mouse to aim the rod. The ring shows where the hook will land.
- Click to cast. The hook takes half a second to reach the water, and catches
  the duck it lands on then, so aim a little ahead of a duck.
- You can't cast again until the hook has come back up.
- You have 8 casts. The round ends when the last cast has come back up.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. The
eight ducks are numbered 10, 20, 10, 50, 10, 20, 10 and 100. A cast that lands
in open water scores nothing. A caught duck leaves the stream for 2 seconds,
then floats back with the same number.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckPosition`,
  `duckUnderHook`) and the `hookADuck` entry, the default export the midway
  finds.
- `game.test.ts`: tests for the game logic.
