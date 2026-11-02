# Ring Toss

Land rings over the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim, and click to throw a ring. The cross shows where a ring
  thrown now would land.
- Your hand sways left and right, up to 30 px either way, so time your throw.
- You have 8 rings. The round ends when you are out of rings and the last ring
  has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 14 px of the centre of a bottle neck. Bottles
further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

Each bottle holds one ring. A ring that lands on a bottle that already has one
bounces off and scores nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `land`, `bottleAt`,
  `sway`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
