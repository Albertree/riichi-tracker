import { type Wind } from "../lib/hand";
import { type Option } from "../lib/option";
import { type ScoreSettings } from "../lib/settings";

export type RepositoryProvider = () => IRepository;

export interface IRepository {
  getGame: (id: string) => Promise<Option<Game>>;
  setGame: (id: string, game: Game) => Promise<void>;
  useGame: (id: string, options?: { enabled: boolean }) => Option<Game> | null;

  getSettings: (id: string) => Promise<Option<ScoreSettings>>;
  setSettings: (id: string, settings: ScoreSettings) => Promise<void>;
  useSettings: (
    id: string,
    options?: { enabled: boolean },
  ) => Option<ScoreSettings> | null;
}

export interface GameState {
  bottomWind: Wind;
  round: number;
  roundWind: Wind;
  repeats: number;
  scores: number[];
  riichiSticks: number;
  riichi: boolean[];
}

export type AbortKind =
  | "nineTerminals"
  | "fourWinds"
  | "fourRiichi"
  | "fourKans"
  | "tripleRon";

export type GameEvent =
  | { t: "start" }
  | { t: "tsumo"; winner: number; points: number }
  | {
      t: "ron";
      wins: { winner: number; points: number }[];
      dealtIn: number;
    }
  | { t: "exhaust"; tenpai: number[]; nagashi: number[] }
  | { t: "abort"; kind: AbortKind }
  | { t: "chombo"; player: number };

export interface HistoryEntry {
  event: GameEvent;
  // The round the event happened in. The player indices in the event are read against this bottom wind.
  bottomWind: Wind;
  roundWind: Wind;
  round: number;
  repeats: number;
  // How far each score moved since the previous entry.
  deltas: number[];
  // The game right after the event.
  state: GameState;
}

export interface Game extends GameState {
  settings: ScoreSettings;
  // Starts with the opening state, then one entry per finished round.
  history: HistoryEntry[];
  // The entry the game currently stands at, which is not the last one after going back.
  historyIndex: number;
}

export type PartialGame = Partial<Game> & { settings: Partial<ScoreSettings> };
