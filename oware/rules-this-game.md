# Rules of this game

The rules this simulator implements, adapted from [rules-online.md](rules-online.md). Single source of truth for the rule text shown in the apps; [rules-online.md](rules-online.md) is the reference for the game itself.

## Shared

- The board has 12 pits holding 48 seeds, 4 per pit.
- Pits 1-6 belong to Player A, pits 7-12 to Player B.
- On your turn, pick a pit on your side and sow its seeds counter-clockwise, one per pit, skipping the pit you picked from.

## Anan-Anan

- A pit reaching 4 seeds during sowing is captured: the pit owner takes them, unless it was the final seed, in which case the player to move captures regardless of side.
- Relay: when the last seed lands in a non-empty pit, pick them all up and keep sowing until the last seed lands in an empty pit.
- The first to capture more than 24 seeds wins. When 8 or fewer seeds are left on the board, the last capturer takes the remaining seeds and the higher total wins, with ties a draw.
- If a relay never settles, the game ends and the player with more captured seeds wins.
- (Add-on) If your side is empty on your turn, the game ends and the player with more captured seeds wins.
- (Add-on) Six moves without a capture end the game, the player with more captured seeds winning.

## Abapa

- After sowing, capture only from the opponent's side: if the last seed lands on a pit with 2 or 3 seeds, take it, then keep taking preceding opponent pits that hold 2 or 3 seeds.
- The first player to capture more than 24 seeds wins; exactly 24 each is a draw.
- (Add-on) If your side is empty on your turn, the game ends and the player with more captured seeds wins.
