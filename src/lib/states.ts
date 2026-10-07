import { type Win } from "../data/interfaces";
import { type Wind } from "./hand";

export type CompassState = { t: "load"; id: string; oldScores?: number[] };

export type CalculatorState =
  | ({
      t: "transfer";
      id: string;
      roundWind: Wind;
      seatWind: Wind;
      winner: number;
      handleRotation: boolean;
      dealerRepeat: boolean;
      scoreRiichiSticks: boolean;
      scoreRepeatSticks: boolean;
      pao: number | null;
    } & (
      | { agari: "tsumo" }
      | {
          agari: "ron";
          dealtInPlayer: number;
          // With several winners on one discard, each hand is calculated in turn,
          // closest to the dealt-in player first, and settled together at the end.
          nextWinners: number[];
          wonSoFar: Win[];
        }
    ))
  | { t: "load"; id: string };
