# Whack-a-Mole

Whack the moles as they pop up from the nine holes, before they duck back down.

## How to play

- A mole pops up from one of the holes in a 3 by 3 grid, stays up for a moment,
  then drops back down.
- Click a mole while it is up to whack it.
- A round lasts 30 seconds. As the clock runs down, moles pop up more often and
  stay up for less time: at the start a new mole comes every 1 second and stays
  up for 1.3 seconds, and by the end one comes every 0.35 seconds and stays up
  for 0.6 seconds.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Clicking an empty hole or missing costs
nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `whack`, `holeAt`,
  `spawnInterval`, `upTime`, `timeLeft`) and the `whackAMole` entry, the
  default export the midway finds.
- `game.test.ts`: tests for the game logic.
