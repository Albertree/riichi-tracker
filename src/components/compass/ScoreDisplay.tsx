import clsx from "clsx";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { type Wind } from "../../lib/hand";
import TileButton from "../calculator/TileButton";
import H from "../text/H";

export default function ScoreDisplay({
  score,
  oldScore = score,
  seatWind,
  isSanma,
  vertical = false,
  riichi = false,
  onScoreClick,
  onTileClick,
  onRiichiClick,
  playerLabel,
}: {
  score: number;
  oldScore?: number;
  seatWind: Wind;
  isSanma: boolean;
  vertical?: boolean;
  riichi?: boolean;
  onScoreClick?: () => void;
  onTileClick?: () => void;
  onRiichiClick?: () => void;
  playerLabel?: string;
}) {
  const { t } = useTranslation();
  // The change on show: where the score rolls from, and a count to restart the effects.
  // After mounting, every change to the score is picked up here, whatever caused it.
  const [change, setChange] = useState({ from: oldScore, to: score, n: 0 });
  const [animDone, setAnimDone] = useState(false);
  if (change.to !== score) {
    setChange({ from: change.to, to: score, n: change.n + 1 });
    setAnimDone(false);
  }
  const delta = score - change.from;
  const dices = isSanma
    ? [
        [1, 4, 7, 10],
        [2, 5, 8, 11],
        [3, 6, 9, 12],
      ][Number(seatWind) - 1]
    : [
        [1, 5, 9],
        [2, 6, 10],
        [3, 7, 11],
        [4, 8, 12],
      ][Number(seatWind) - 1];
  return (
    <div
      className={clsx(
        vertical
          ? "flex h-full w-31 flex-row-reverse lg:w-45"
          : "flex h-31 w-full flex-col lg:h-45",
        "items-center justify-center gap-1",
      )}
    >
      <div className="justify-centers flex flex-row items-center gap-x-2">
        <button
          onClick={onRiichiClick}
          className={clsx(
            "rounded-xl border border-gray-800 text-center text-sm shadow md:text-lg lg:text-2xl",
            vertical
              ? "h-40 w-9 px-1.5 py-8 lg:h-80 lg:w-14"
              : "h-9 w-40 px-8 py-1.5 lg:h-14 lg:w-80",
            riichi
              ? "bg-amber-500 enabled:hover:bg-amber-600 dark:bg-amber-700 dark:enabled:hover:bg-amber-800"
              : "bg-gray-50 enabled:hover:bg-gray-200 dark:bg-gray-500 dark:enabled:hover:bg-gray-600",
          )}
        >
          <span
            className={clsx(
              // Sideways, so the label faces the player it belongs to like the score does.
              vertical
                ? "[text-orientation:sideways] [writing-mode:vertical-rl]"
                : "",
            )}
          >
            {t("compass.riichi")}
          </span>
        </button>
        {playerLabel && (
          <div className="rounded bg-slate-300 p-0.5 shadow lg:p-1 dark:bg-sky-900">
            <H>{playerLabel}</H>
          </div>
        )}
      </div>
      <div
        className={clsx(
          vertical
            ? "flex h-full w-fit flex-col p-1.5 lg:px-4 lg:py-2"
            : "flex h-fit w-full flex-row p-1.5 lg:px-2 lg:py-4",
          "relative items-center justify-between rounded-xl bg-slate-300 shadow dark:bg-sky-900",
        )}
      >
        {delta !== 0 && (
          <span
            key={change.n}
            className={clsx(
              "pointer-events-none absolute animate-score-delta text-sm font-bold lg:text-xl",
              delta > 0
                ? "text-green-700 dark:text-green-500"
                : "text-red-600 dark:text-red-500",
              // Inside the box, along the edge facing the centre, in the gap before the wind tile.
              vertical
                ? "right-0.5 bottom-16 [text-orientation:sideways] [writing-mode:vertical-rl] lg:right-1 lg:bottom-24"
                : "top-0.5 right-16 lg:top-1 lg:right-24",
            )}
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
        <span
          className={clsx(
            isSanma
              ? vertical
                ? "h-5 w-16 [writing-mode:vertical-rl] lg:w-20"
                : "h-16 w-5 lg:h-20"
              : vertical
                ? "h-5 w-12 [writing-mode:vertical-rl] lg:w-20"
                : "h-12 w-5 lg:h-20",
            isSanma ? "lg:text-sm" : "lg:text-lg",
            "text-center text-xs font-semibold text-slate-900 dark:text-slate-400",
          )}
        >
          {dices.map((x, i, a) => (
            <>
              {x}
              {i !== a.length && <br />}
            </>
          ))}
        </span>
        <button
          className={clsx(
            "text-4xl font-bold lg:text-6xl",
            vertical ? "h-52 w-12 lg:w-20" : "h-12 w-52 lg:h-20",
          )}
          onClick={onScoreClick}
        >
          <span className={clsx(vertical ? "[writing-mode:vertical-rl]" : "")}>
            {animDone || delta === 0 ? (
              <H>{score}</H>
            ) : delta < 0 ? (
              <H.Red>
                <AnimatedIncrement
                  key={change.n}
                  start={change.from / 100}
                  end={score / 100}
                  map={(x) => x * 100}
                  duration={1000}
                  onDone={() => setAnimDone(true)}
                />
              </H.Red>
            ) : (
              <H>
                <AnimatedIncrement
                  key={change.n}
                  start={change.from / 100}
                  end={score / 100}
                  map={(x) => x * 100}
                  duration={1000}
                  onDone={() => setAnimDone(true)}
                />
              </H>
            )}
          </span>
        </button>
        <div
          className={clsx(
            vertical ? "mx-2 -my-2 rotate-90" : "",
            "flex flex-col items-center justify-center",
          )}
        >
          <TileButton
            onClick={onTileClick}
            red={seatWind === "1"}
            tile={`${seatWind}z`}
          ></TileButton>
        </div>
      </div>
    </div>
  );
}

function AnimatedIncrement({
  start,
  end,
  map = (x) => x,
  duration,
  onDone,
}: {
  start: number;
  end: number;
  map?: (n: number) => number;
  duration: number;
  onDone?: () => void;
}) {
  const [value, setValue] = useState(start);
  const startTimestamp = useRef<number | null>(null);
  const step = (timestamp: number) => {
    if (!startTimestamp.current) startTimestamp.current = timestamp;
    const progress = Math.min(
      (timestamp - startTimestamp.current) / duration,
      1,
    );
    setValue(map(Math.floor(progress * (end - start) + start)));
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      onDone?.();
    }
  };
  // eslint-disable-next-line react-hooks/refs
  window.requestAnimationFrame(step);
  return <span>{value}</span>;
}
