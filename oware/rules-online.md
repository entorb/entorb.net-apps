# Oware rules

Copied from [owaregame.com/rules.html](https://owaregame.com/rules.html) who offer a great free [online version](https://owaregame.com) of the game.

## How oware is played

Oware is a turn based board game played on a board with pits and counters (seeds). The main objective of the game is to capture as many seeds from the board before the game ends. At the end of the game, the player with more seeds wins.

Oware boards have twelve pits and forty-eight seeds. Some boards have two extra larger pits which are used to collect captured seeds. Gameplay usually involves collecting seeds from a pit and either getting them off the board as captured seeds or distributing them across the board based on the rules that apply.

There are several rule sets used for playing oware. For this simulation however, we would support only the Anan-Anan (also known as four-four or ayo) and the Abapa rules. Anan-anan offers a fun filled fast paced gameplay while ayo offers a more strategic gameplay.

## Mode 1: Anan-anan

An anan-anan game starts with all forty-eight seeds equally distributed into all the twelve pits with four seeds in each pit. Each player owns the pits that are on their side of the board. To play a turn, an player selects a pit owned by them and distributes its seeds in a counter-clockwise direction around the board. When the seeds collected for distribution run out, the player picks up the seeds in the last pit into which the last seed was dropped and continues distributing. This continues until the last seed is put into an empty pit. Once an empty pit is reached, turns change.

Players can capture seeds from their side of the board when the number of seeds in any given pit increases to four during a distribution. This rule applies no matter who's turn it is. The only exception to this rule occurs when the last seed is dropped into a pit which contains three seeds to make it four. In such a case the player who's turn it is captures the seeds regardless of who's side of the board it is. When there are eight seeds left on the board, the last player to capture seeds of the board takes all eight seeds and the game ends. The player with most seeds wins.

Anan-anan games also require the player to pick up seeds in one of the pits on her side for counter-clockwise distribution around the board. When the last seed is dropped into a pit which is not empty, or does not contain three seeds, the player is required to pick the seeds in the pit and continue distributing them until the last seed is dropped into an empty pit. In the case where the last seed is dropped into a pit containing three seeds (to make four seeds), the current player captures that pit irrespective of who owns the pit. Most other captures occur when a seed (which is not the last seed to be dropped) is dropped into a pit containing three seeds. In such a case the owner of the pit picks up the seeds. The game ends when one player captures more than 24 seeds. Given the recursive nature of the Anan-anan rules, it is sometimes possible for the game to hit a state where distribution continues indefinitely. In such cases the game ends and the winner becomes the one with the highest number of captured seeds.

## Mode 2: Abapa

An abapa game also starts with all forty-eight seeds equally distributed into all the pits and just like the anan-anan games each player also owns the side of the board that faces them. To play a turn, a player selects a pit on their side of the board and distributes its seeds in a counter-clockwise direction around the board. Unlike an anan-anan game however, the player stops distributing when the seeds collected runs out and turns change.

Players can capture seeds only when the last seed is dropped into a seed on their opponents side to make the total number of seeds in the pit either two or three. The game ends whenever a player captures more than twenty-four seeds.

To play a turn in Abapa, a player picks up the seeds in any of the pits under her control and goes ahead to distribute these seeds in a counter-clockwise direction around the board, until the seeds in the players hands are finished. When the last seed is dropped in a pit on the opponents side which contains one or two seeds, the player captures those seeds. If the pits preceding the captured pit also contain two or three seeds, the player captures those as well. In the case where the player picks up enough seeds to go round all the pits on the board, the player must skip the pit they originally picked the seeds from to start the distribution. There could be an instance when all the pits on the opponents side contain one or two seeds, the player can play a move to capture all the seeds on the opponents side. This is known as the “kroo” move or the “grand-slam” move (Climent, Canal, and Casanovas n.d.). The grand-slam move is quite controversial and it is disallowed in some cases (Sandler 2011). An “Abapa” game ends when one player captures more than 24 seeds. In that case the player with more seeds is the winner. It could also end in a draw when both players capture 24 seeds.
