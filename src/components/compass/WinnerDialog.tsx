import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { type Game } from "../../data/interfaces";
import { nextWind } from "../../lib/hand";
import { type CalculatorState } from "../../lib/states";
import Button from "../Button";
import CustomDialog from "../layout/CustomDialog";
import HorizontalRow from "../layout/HorizontalRow";
import Toggle from "../Toggle";
import ToggleOnOff from "../ToggleOnOff";
import PlayerButton from "./PlayerButton";

export function WinnerDialog({
  winner,
  gameId,
  game,
  onClose,
}: {
  winner: number;
  gameId: string;
  game: Game;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { bottomWind, roundWind, settings } = game;
  const isSanma = settings.sanma != null;
  const playerIxes = isSanma ? [0, 1, 2] : [0, 1, 2, 3];
  const seatWindOf = (i: number) => nextWind(bottomWind, i, isSanma);
  const seatWind = seatWindOf(winner);
  // Someone has to deal in, and three winners is a draw when sanchahou is on.
  const maxWinners =
    playerIxes.length - 1 - (!isSanma && settings.sanchahou ? 1 : 0);

  const [agari, setAgari] = useState<
    { t: "tsumo" } | { t: "ron"; dealIn: number }
  >({ t: "tsumo" });
  // Only ron can have more than one winner.
  const [winners, setWinners] = useState([winner]);
  const [handleRotation, setHandleRotation] = useState(seatWind !== "1");
  const [dealerRepeat, setDealerRepeat] = useState(seatWind === "1");
  const [scoreRiichiSticks, setScoreRiichiSticks] = useState(true);
  const [scoreRepeatSticks, setScoreRepeatSticks] = useState(true);
  const [isPao, setIsPao] = useState(false);
  const [paoPlayer, setPaoPlayer] = useState<number | null>(null);

  const dealerWins = winners.some((i) => seatWindOf(i) === "1");
  const paoCandidates = playerIxes.filter(
    (i) =>
      !winners.includes(i) && (agari.t === "ron" ? i !== agari.dealIn : true),
  );

  const changeWinners = (winners_: number[]) => {
    const dealerWins_ = winners_.some((i) => seatWindOf(i) === "1");
    setWinners(winners_);
    setDealerRepeat(dealerWins_);
    setHandleRotation(!dealerWins_);
    setIsPao(false);
    setPaoPlayer(null);
  };

  const toggleWinner = (i: number) => {
    if (agari.t !== "ron") {
      return;
    }
    let winners_: number[];
    if (winners.includes(i)) {
      if (winners.length === 1) {
        return;
      }
      winners_ = winners.filter((j) => j !== i);
    } else {
      if (winners.length >= maxWinners) {
        return;
      }
      winners_ = [...winners, i];
    }
    if (winners_.includes(agari.dealIn)) {
      setAgari({
        t: "ron",
        dealIn: playerIxes.filter((j) => !winners_.includes(j))[0],
      });
    }
    changeWinners(winners_);
  };

  const submitWinner = () => {
    const common = {
      t: "transfer",
      id: gameId,
      roundWind,
      handleRotation,
      dealerRepeat: dealerWins && dealerRepeat,
      scoreRiichiSticks,
      scoreRepeatSticks,
      pao: isPao ? paoPlayer : null,
    } as const;
    let state: CalculatorState;
    if (agari.t === "tsumo") {
      state = { ...common, winner, seatWind, agari: "tsumo" };
    } else {
      // Turn order runs upwards through the player indices.
      const turnsAfterDealIn = (i: number) =>
        (i - agari.dealIn + playerIxes.length) % playerIxes.length;
      const [first, ...rest] = winners
        .slice()
        .sort((a, b) => turnsAfterDealIn(a) - turnsAfterDealIn(b));
      state = {
        ...common,
        winner: first,
        seatWind: seatWindOf(first),
        agari: "ron",
        dealtInPlayer: agari.dealIn,
        nextWinners: rest,
        wonSoFar: [],
      };
    }
    void navigate("/calculator", { state, replace: true });
  };

  return (
    <CustomDialog onClose={onClose} title={t("compass.transferPoints")}>
      <div className="flex flex-col items-center justify-center gap-y-8">
        <form
          className="flex flex-col items-center justify-center gap-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitWinner();
          }}
        >
          <p className="text-xl lg:text-2xl">
            {t("compass.pointDistribution")}
          </p>
          <Toggle
            toggled={agari.t === "ron"}
            onToggle={(b) => {
              setAgari(
                b
                  ? {
                      t: "ron",
                      dealIn: playerIxes.filter((i) => i !== winner)[0],
                    }
                  : { t: "tsumo" },
              );
              changeWinners([winner]);
            }}
            left={t("common.tsumo")}
            right={t("common.ron")}
          />
          {agari.t === "ron" && (
            <>
              <p className="text-xl lg:text-2xl">{t("compass.winners")}</p>
              <HorizontalRow>
                {playerIxes.map((i) => (
                  <PlayerButton
                    key={i}
                    wind={seatWindOf(i)}
                    selected={winners.includes(i)}
                    disabled={
                      !winners.includes(i) && winners.length >= maxWinners
                    }
                    onClick={() => toggleWinner(i)}
                  />
                ))}
              </HorizontalRow>
              <p className="text-xl lg:text-2xl">
                {t("compass.dealtinPlayer")}
              </p>
              <HorizontalRow>
                {playerIxes
                  .filter((i) => !winners.includes(i))
                  .map((i) => (
                    <PlayerButton
                      key={i}
                      wind={seatWindOf(i)}
                      selected={i === agari.dealIn}
                      onClick={() => {
                        setAgari({ t: "ron", dealIn: i });
                        if (paoPlayer === i) {
                          setPaoPlayer(
                            playerIxes.filter(
                              (j) => !winners.includes(j) && j !== i,
                            )[0],
                          );
                        }
                      }}
                    />
                  ))}
              </HorizontalRow>
            </>
          )}
          <ToggleOnOff
            toggled={scoreRiichiSticks}
            onToggle={(b) => setScoreRiichiSticks(b)}
          >
            {t("compass.scoreRiichiSticks")}
          </ToggleOnOff>
          <ToggleOnOff
            toggled={scoreRepeatSticks}
            onToggle={(b) => setScoreRepeatSticks(b)}
          >
            {t("compass.scoreRepeatSticks")}
          </ToggleOnOff>
          {settings.usePao && winners.length === 1 && (
            <>
              <ToggleOnOff
                toggled={isPao}
                onToggle={(b) => {
                  setIsPao(b);
                  setPaoPlayer(b ? paoCandidates[0] : null);
                }}
              >
                {t("compass.pao")}
              </ToggleOnOff>
              {isPao && (
                <>
                  <p className="text-xl lg:text-2xl">
                    {t("compass.responsiblePlayer")}
                  </p>
                  <HorizontalRow>
                    {paoCandidates.map((i) => (
                      <PlayerButton
                        key={i}
                        wind={seatWindOf(i)}
                        selected={i === paoPlayer}
                        onClick={() => setPaoPlayer(i)}
                      />
                    ))}
                  </HorizontalRow>
                </>
              )}
            </>
          )}
          <p className="text-xl lg:text-2xl">{t("compass.seatRotation")}</p>
          {dealerWins && (
            <ToggleOnOff
              toggled={dealerRepeat}
              incompatible={handleRotation}
              onToggle={(b) => {
                setDealerRepeat(b);
                if (b) {
                  setHandleRotation(false);
                }
              }}
            >
              {t("compass.dealerRepeat")}
            </ToggleOnOff>
          )}
          <ToggleOnOff
            toggled={handleRotation}
            incompatible={dealerWins && dealerRepeat}
            onToggle={(b) => {
              setHandleRotation(b);
              if (b) {
                if (dealerWins) {
                  setDealerRepeat(false);
                }
              }
            }}
          >
            {t("compass.rotateSeats")}
          </ToggleOnOff>
        </form>
        <Button
          onClick={() => {
            void submitWinner();
          }}
        >
          {t("compass.calculateHand")}
        </Button>
      </div>
    </CustomDialog>
  );
}
