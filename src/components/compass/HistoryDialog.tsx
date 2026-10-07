import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { type Game, type HistoryEntry, type Win } from "../../data/interfaces";
import { getWindNameTranslated, limitOf, nextWind } from "../../lib/hand";
import { restoreEntry } from "../../lib/history";
import { useDb } from "../../providers/DbProvider";
import CustomDialog from "../layout/CustomDialog";

export function HistoryDialog({
  gameId,
  game,
  onClose,
}: {
  gameId: string;
  game: Game;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const db = useDb();

  const { history, historyIndex, settings } = game;
  const isSanma = settings.sanma != null;
  const playerIxes = isSanma ? [0, 1, 2] : [0, 1, 2, 3];

  // Players are named by the seat they held in the round the entry is about.
  const windName = (entry: HistoryEntry, i: number) =>
    getWindNameTranslated(nextWind(entry.bottomWind, i, isSanma))(t);
  const seat = (entry: HistoryEntry, i: number) =>
    t("compass.history.seat", { wind: windName(entry, i) });
  const seats = (entry: HistoryEntry, players: number[]) =>
    inSeatOrder(entry, players)
      .map((i) => seat(entry, i))
      .join(", ");
  // East first, the way the seats are usually read out.
  const inSeatOrder = (entry: HistoryEntry, players: number[]) =>
    players
      .slice()
      .sort(
        (a, b) =>
          Number(nextWind(entry.bottomWind, a, isSanma)) -
          Number(nextWind(entry.bottomWind, b, isSanma)),
      );

  // "Mangan (8000 points)", or the han and fu below a mangan.
  const value = ({ hand, points }: Win) => {
    if (hand == null) {
      return t("compass.history.points", { points });
    }
    const limit = limitOf(hand.han, hand.fu, settings);
    const name =
      hand.yakuman > 6
        ? t("common.yakuman.over", { value: hand.yakuman })
        : hand.yakuman > 0
          ? t(`common.yakuman.${hand.yakuman}`)
          : limit != null
            ? t(`common.${limit}`)
            : t("compass.history.hanFu", { han: hand.han, fu: hand.fu });
    return t("compass.history.value", { name, points });
  };

  const describe = (entry: HistoryEntry): string[] => {
    const { event } = entry;
    switch (event.t) {
      case "start":
        return [];
      case "tsumo":
        return [
          t("compass.history.tsumo", { winner: seat(entry, event.winner) }),
          value(event),
        ];
      case "ron":
        return event.wins.length === 1
          ? [
              t("compass.history.ron", {
                winner: seat(entry, event.wins[0].winner),
                dealtIn: seat(entry, event.dealtIn),
              }),
              value(event.wins[0]),
            ]
          : [
              t(
                event.wins.length === 3
                  ? "compass.history.tripleRon"
                  : "compass.history.doubleRon",
                { dealtIn: seat(entry, event.dealtIn) },
              ),
              ...event.wins.map((win) =>
                t("compass.history.winnerValue", {
                  seat: seat(entry, win.winner),
                  value: value(win),
                }),
              ),
            ];
      case "exhaust":
        return [
          t("compass.exhaust"),
          ...(event.nagashi.length > 0
            ? [
                t("compass.history.nagashi", {
                  players: seats(entry, event.nagashi),
                }),
              ]
            : []),
          event.tenpai.length > 0
            ? t("compass.history.tenpai", {
                players: seats(entry, event.tenpai),
              })
            : t("compass.history.noTenpai"),
        ];
      case "abort":
        return [
          `${t("compass.abort")} · ${t(`compass.abortKind.${event.kind}`)}`,
        ];
      case "chombo":
        return [
          t("compass.history.chombo", { player: seat(entry, event.player) }),
        ];
    }
  };

  return (
    <CustomDialog title={t("compass.history.$")} onClose={onClose}>
      <ol className="flex flex-col items-center justify-center gap-y-2">
        {history.map((entry, ix) => (
          <li key={ix}>
            <button
              className={clsx(
                "flex w-72 flex-col gap-y-1 rounded-xl border p-2 text-left shadow lg:w-108",
                ix === historyIndex
                  ? "border-green-700 bg-green-200 ring-2 ring-green-600 dark:bg-green-900"
                  : "border-gray-800 bg-gray-50 hover:bg-gray-200 dark:bg-gray-500 dark:hover:bg-gray-600",
              )}
              onClick={(e) => {
                e.preventDefault();
                if (ix !== historyIndex) {
                  void db.setGame(gameId, restoreEntry(game, ix));
                }
              }}
            >
              <span className="flex flex-row items-center justify-between gap-x-2 text-lg font-bold lg:text-2xl">
                <span>
                  {entry.event.t === "start"
                    ? t("compass.history.start")
                    : t("compass.history.round", {
                        wind: getWindNameTranslated(entry.roundWind)(t),
                        round: entry.round,
                        repeats: entry.repeats,
                      })}
                </span>
                {ix === historyIndex && (
                  <span className="rounded-full bg-green-700 px-2 text-sm text-white lg:text-lg">
                    {t("compass.history.current")}
                  </span>
                )}
              </span>
              {describe(entry).map((line, i) => (
                <span key={i} className="text-base lg:text-xl">
                  {line}
                </span>
              ))}
              <span className="grid grid-cols-2 gap-x-2 text-sm lg:text-lg">
                {inSeatOrder(entry, playerIxes).map((i) => (
                  <span
                    key={i}
                    className="flex flex-row items-baseline justify-between gap-x-1"
                  >
                    <span>
                      {windName(entry, i)} {entry.state.scores[i]}
                    </span>
                    {entry.deltas[i] !== 0 && (
                      <span
                        className={clsx(
                          "font-bold",
                          entry.deltas[i] > 0
                            ? "text-green-700 dark:text-green-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {entry.deltas[i] > 0
                          ? `+${entry.deltas[i]}`
                          : entry.deltas[i]}
                      </span>
                    )}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </CustomDialog>
  );
}
