import {
  type Game,
  type GameEvent,
  type GameState,
  type HistoryEntry,
} from "../data/interfaces";

export function gameState(game: GameState): GameState {
  return {
    bottomWind: game.bottomWind,
    round: game.round,
    roundWind: game.roundWind,
    repeats: game.repeats,
    scores: game.scores.slice(),
    riichiSticks: game.riichiSticks,
    riichi: game.riichi.slice(),
  };
}

/** A history holding only the given state, for a new game. */
export function startHistory(
  state: GameState,
): Pick<Game, "history" | "historyIndex"> {
  return {
    history: [
      {
        event: { t: "start" },
        bottomWind: state.bottomWind,
        roundWind: state.roundWind,
        round: state.round,
        repeats: state.repeats,
        deltas: state.scores.map(() => 0),
        state: gameState(state),
      },
    ],
    historyIndex: 0,
  };
}

/**
 * Adds what happened between `before` and `after` to the history.
 * Entries past the current one are dropped: after going back, the game continues from there.
 */
export function recordEvent(before: Game, after: Game, event: GameEvent): Game {
  const kept = before.history.slice(0, before.historyIndex + 1);
  const base = kept[kept.length - 1].state.scores;
  const entry: HistoryEntry = {
    event,
    bottomWind: before.bottomWind,
    roundWind: before.roundWind,
    round: before.round,
    repeats: before.repeats,
    deltas: after.scores.map((score, i) => score - base[i]),
    state: gameState(after),
  };
  return { ...after, history: [...kept, entry], historyIndex: kept.length };
}

/** Puts the game back to how it was right after the given entry, keeping every entry. */
export function restoreEntry(game: Game, index: number): Game {
  return {
    ...game,
    ...gameState(game.history[index].state),
    historyIndex: index,
  };
}
