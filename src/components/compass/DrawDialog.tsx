import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useImmer } from "use-immer";

import { type Game } from "../../data/interfaces";
import { calculateScoreTable, nextWind } from "../../lib/hand";
import { replicate } from "../../lib/util";
import { useDb } from "../../providers/DbProvider";
import Button from "../Button";
import CustomDialog from "../layout/CustomDialog";
import HorizontalRow from "../layout/HorizontalRow";
import { HTrans } from "../text/Localized";
import ToggleOnOff from "../ToggleOnOff";
import ToggleThree from "../ToggleThree";
import PlayerButton from "./PlayerButton";

const abortKinds = [
  "nineTerminals",
  "fourWinds",
  "fourRiichi",
  "fourKans",
  "tripleRon",
] as const;
type AbortKind = (typeof abortKinds)[number];

export function DrawDialog({
  gameId,
  game,
  onClose,
  onScoreUpdate,
}: {
  gameId: string;
  game: Game;
  onClose: () => void;
  onScoreUpdate: (oldScores: number[]) => void;
}) {
  const { t } = useTranslation();
  const db = useDb();

  const { bottomWind, roundWind, round, repeats, settings } = game;
  const isSanma = settings.sanma != null;
  const roundCap = isSanma ? 3 : 4;
  const playerIxes = isSanma ? [0, 1, 2] : [0, 1, 2, 3];

  // exhaustive, abortive, chombo
  const [drawType, setDrawType] = useState<0 | 1 | 2>(0);
  const [tenpaiPlayers, updateTenpaiPlayers] = useImmer(
    new Set<number>(game.riichi.flatMap((x, i) => (x ? [i] : []))),
  );
  const [drawRepeat, setDrawRepeat] = useState(
    playerIxes.some(
      (i) => tenpaiPlayers.has(i) && nextWind(bottomWind, i, isSanma) === "1",
    ),
  );
  const [nagashiPlayers, updateNagashiPlayers] = useImmer(new Set<number>());
  const [abortKind, setAbortKind] = useState<AbortKind>("nineTerminals");
  const [violationPlayer, setViolationPlayer] = useState<number>(0);

  const isDealer = (i: number) => nextWind(bottomWind, i, isSanma) === "1";
  const nagashiWins = settings.nagashiAsWin && nagashiPlayers.size > 0;
  const availableAbortKinds = abortKinds.filter((k) =>
    isSanma
      ? k === "nineTerminals" || k === "fourKans"
      : k !== "tripleRon" || settings.sanchahou,
  );

  const submitDraw = async () => {
    if (drawType === 0) {
      const scores_ = game.scores.slice();
      let riichiSticks_ = game.riichiSticks;
      if (nagashiPlayers.size > 0) {
        // Each one is paid a mangan tsumo, and noten payments are skipped.
        const mangan = calculateScoreTable(2000, settings);
        for (const winner of nagashiPlayers) {
          for (const loser of playerIxes.filter((i) => i !== winner)) {
            const delta =
              (isDealer(winner) || isDealer(loser)
                ? mangan.tsumoAsFromOya
                : mangan.tsumoAsKo) + (nagashiWins ? repeats * 100 : 0);
            scores_[winner] += delta;
            scores_[loser] -= delta;
          }
        }
        if (nagashiWins) {
          // The pot goes to the first of them in turn order from the dealer.
          const dealer = playerIxes.find(isDealer)!;
          const first = playerIxes
            .map((k) => (dealer + k) % playerIxes.length)
            .find((i) => nagashiPlayers.has(i))!;
          scores_[first] += 1000 * riichiSticks_;
          riichiSticks_ = 0;
        }
      } else {
        const win = (isSanma ? [0, 2000, 1000, 0] : [0, 3000, 1500, 1000, 0])[
          tenpaiPlayers.size
        ];
        const lose = (isSanma ? [0, 1000, 2000, 0] : [0, 1000, 1500, 3000, 0])[
          tenpaiPlayers.size
        ];
        for (const i of playerIxes) {
          if (tenpaiPlayers.has(i)) {
            scores_[i] += win;
          } else {
            scores_[i] -= lose;
          }
        }
      }
      const repeat = nagashiWins
        ? playerIxes.some((i) => nagashiPlayers.has(i) && isDealer(i))
        : drawRepeat &&
          playerIxes.some((i) => tenpaiPlayers.has(i) && isDealer(i));
      await db.setGame(gameId, {
        ...game,
        bottomWind: repeat ? bottomWind : nextWind(bottomWind, -1, isSanma),
        roundWind: repeat
          ? roundWind
          : round === roundCap
            ? nextWind(roundWind, 1, isSanma)
            : roundWind,
        round: repeat ? round : round === roundCap ? 1 : round + 1,
        // A mangan at draw that counts as a win clears the repeats like any other win.
        repeats: nagashiWins && !repeat ? 0 : repeats + 1,
        scores: scores_,
        riichiSticks: riichiSticks_,
        riichi: replicate(false, isSanma ? 3 : 4),
      });
      onScoreUpdate(game.scores);
    } else if (drawType === 1) {
      const scores_ = game.scores.slice();
      let riichiSticks_ = game.riichiSticks;
      if (abortKind === "fourRiichi") {
        // Everyone has declared, so collect the sticks that were not entered yet.
        for (const i of playerIxes.filter((i) => !game.riichi[i])) {
          scores_[i] -= 1000;
          riichiSticks_ += 1;
        }
      }
      await db.setGame(gameId, {
        ...game,
        repeats: game.repeats + 1,
        scores: scores_,
        riichiSticks: riichiSticks_,
        riichi: replicate(false, isSanma ? 3 : 4),
      });
      onScoreUpdate(game.scores);
    } else {
      const scores_ = game.scores.slice();
      // A reverse mangan: the player in violation pays out a mangan to the others.
      const bisection = settings.sanma === "bisection";
      for (const i of playerIxes) {
        if (i !== violationPlayer) {
          const delta = isDealer(violationPlayer)
            ? bisection
              ? 6000
              : 4000
            : isDealer(i) || bisection
              ? 4000
              : 2000;
          scores_[i] += delta;
          scores_[violationPlayer] -= delta;
        }
        if (game.riichi[i]) {
          scores_[i] += 1000;
        }
      }
      await db.setGame(gameId, {
        ...game,
        scores: scores_,
        riichi: replicate(false, isSanma ? 3 : 4),
        riichiSticks: game.riichiSticks - game.riichi.filter((x) => x).length,
      });
      onScoreUpdate(game.scores);
    }
    onClose();
  };

  return (
    <CustomDialog onClose={onClose} title={t("compass.handleDraws")}>
      <div className="flex flex-col items-center justify-center gap-y-8">
        <form
          className="flex flex-col items-center justify-center gap-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitDraw();
          }}
        >
          <p className="text-xl lg:text-2xl">{t("compass.drawType")}</p>
          <ToggleThree
            left={t("compass.exhaust")}
            middle={t("compass.abort")}
            right={t("compass.chombo")}
            toggled={drawType}
            onToggle={(b) => setDrawType(b)}
          />
          {drawType === 0 && (
            <>
              <p className="text-xl lg:text-2xl">
                {t("compass.nagashiPlayers")}
              </p>
              <HorizontalRow>
                {playerIxes.map((i) => (
                  <PlayerButton
                    key={i}
                    wind={nextWind(bottomWind, i, isSanma)}
                    selected={nagashiPlayers.has(i)}
                    onClick={() => {
                      updateNagashiPlayers((s) => {
                        if (s.has(i)) {
                          s.delete(i);
                        } else {
                          s.add(i);
                        }
                      });
                    }}
                  />
                ))}
              </HorizontalRow>
              {/* As a win, the round repeats on the dealer's mangan rather than on tenpai. */}
              {!nagashiWins && (
                <>
                  <p className="text-xl lg:text-2xl">
                    {t("compass.readyPlayers")}
                  </p>
                  <HorizontalRow>
                    {playerIxes.map((i) => (
                      <PlayerButton
                        key={i}
                        wind={nextWind(bottomWind, i, isSanma)}
                        selected={tenpaiPlayers.has(i)}
                        forced={game.riichi[i]}
                        onClick={() => {
                          if (isDealer(i)) {
                            setDrawRepeat(!tenpaiPlayers.has(i));
                          }
                          updateTenpaiPlayers((s) => {
                            if (s.has(i)) {
                              s.delete(i);
                            } else {
                              s.add(i);
                            }
                          });
                        }}
                      />
                    ))}
                  </HorizontalRow>
                  <ToggleOnOff
                    toggled={drawRepeat}
                    onToggle={(b) => setDrawRepeat(b)}
                  >
                    {t("compass.repeatRound")}
                  </ToggleOnOff>
                </>
              )}
            </>
          )}
          {drawType === 1 && (
            <>
              <p className="text-xl lg:text-2xl">{t("compass.abortType")}</p>
              {availableAbortKinds.map((k) => (
                <Button
                  key={k}
                  active={abortKind === k}
                  onClick={() => setAbortKind(k)}
                >
                  {t(`compass.abortKind.${k}`)}
                </Button>
              ))}
              {abortKind === "fourRiichi" && game.riichi.some((x) => !x) && (
                <p className="text-base lg:text-xl">
                  {t("compass.fourRiichiPays")}
                </p>
              )}
            </>
          )}
          {drawType === 2 && (
            <>
              <p className="text-xl lg:text-2xl">
                {t("compass.playerInViolation")}
              </p>
              <HorizontalRow>
                {playerIxes.map((i) => (
                  <PlayerButton
                    key={i}
                    wind={nextWind(bottomWind, i, isSanma)}
                    selected={violationPlayer === i}
                    onClick={() => {
                      setViolationPlayer(i);
                    }}
                  />
                ))}
              </HorizontalRow>
              <ul className="text-base lg:text-xl">
                <li>
                  <HTrans i18nKey="compass.paysOutReverseMangan" />
                </li>
                <li>{t("compass.redoesTheRound")}</li>
              </ul>
            </>
          )}
        </form>
        <Button
          onClick={() => {
            void submitDraw();
          }}
        >
          {t("common.submit")}
        </Button>
      </div>
    </CustomDialog>
  );
}
