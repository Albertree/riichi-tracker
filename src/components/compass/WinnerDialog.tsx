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
import ToggleOptional from "../ToggleOptional";
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
  // Turn order runs upwards through the player indices.
  const turnsAfter = (from: number) => (i: number) =>
    (i - from + playerIxes.length) % playerIxes.length;
  const inTurnOrderAfter = (from: number) =>
    playerIxes
      .filter((i) => i !== from)
      .sort((a, b) => turnsAfter(from)(a) - turnsAfter(from)(b));
  // Someone has to deal in, and three winners is a draw when sanchahou is on.
  const canTripleRon = !isSanma && !settings.sanchahou;

  const [agari, setAgari] = useState<
    { t: "tsumo" } | { t: "ron"; dealIn: number }
  >({ t: "tsumo" });
  // Only ron can have more than one winner.
  const [ronCount, setRonCount] = useState<1 | 2 | 3>(1);
  const [coWinner, setCoWinner] = useState<number | null>(null);
  const [handleRotation, setHandleRotation] = useState(seatWind !== "1");
  const [dealerRepeat, setDealerRepeat] = useState(seatWind === "1");
  const [scoreRiichiSticks, setScoreRiichiSticks] = useState(true);
  const [scoreRepeatSticks, setScoreRepeatSticks] = useState(true);
  const [isPao, setIsPao] = useState(false);
  const [paoPlayer, setPaoPlayer] = useState<number | null>(null);

  // Closest to the dealt-in player first, which is also who takes the riichi sticks.
  const winnersFor = (
    dealIn: number | null,
    ronCount_: 1 | 2 | 3,
    coWinner_: number | null,
  ) => {
    if (dealIn == null || ronCount_ === 1) {
      return [winner];
    }
    const candidates = inTurnOrderAfter(dealIn);
    // Everyone but the dealt-in player won, so there is nobody left to pick.
    return ronCount_ === candidates.length
      ? candidates
      : candidates.filter((i) => i === winner || i === coWinner_);
  };
  const dealIn = agari.t === "ron" ? agari.dealIn : null;
  const winners = winnersFor(dealIn, ronCount, coWinner);
  const winnerCandidates = dealIn == null ? [] : inTurnOrderAfter(dealIn);
  const dealerWins = winners.some((i) => seatWindOf(i) === "1");
  const paoCandidates = playerIxes.filter((i) => i !== winner && i !== dealIn);

  const change = (
    dealIn_: number | null,
    ronCount_: 1 | 2 | 3,
    coWinner_: number | null,
  ) => {
    if (coWinner_ === dealIn_) {
      coWinner_ = null;
    }
    const dealerWins_ = winnersFor(dealIn_, ronCount_, coWinner_).some(
      (i) => seatWindOf(i) === "1",
    );
    setAgari(dealIn_ == null ? { t: "tsumo" } : { t: "ron", dealIn: dealIn_ });
    setRonCount(ronCount_);
    setCoWinner(coWinner_);
    setDealerRepeat(dealerWins_);
    setHandleRotation(!dealerWins_);
    if (ronCount_ > 1 || paoPlayer === dealIn_) {
      setIsPao(false);
      setPaoPlayer(null);
    }
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
      const [first, ...rest] = winners;
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
            onToggle={(b) =>
              change(b ? inTurnOrderAfter(winner)[0] : null, 1, null)
            }
            left={t("common.tsumo")}
            right={t("common.ron")}
          />
          {dealIn != null && (
            <>
              <p className="text-xl lg:text-2xl">{t("compass.multipleRon")}</p>
              {canTripleRon ? (
                <ToggleOptional
                  toggled={ronCount === 1 ? null : ronCount === 2 ? 0 : 1}
                  onToggle={(side) =>
                    change(
                      dealIn,
                      side == null ? 1 : side === 0 ? 2 : 3,
                      coWinner,
                    )
                  }
                  left={t("compass.doubleRon")}
                  right={t("compass.tripleRon")}
                />
              ) : (
                <ToggleOnOff
                  toggled={ronCount === 2}
                  onToggle={(b) => change(dealIn, b ? 2 : 1, coWinner)}
                >
                  {t("compass.doubleRon")}
                </ToggleOnOff>
              )}
              <p className="text-xl lg:text-2xl">
                {t("compass.dealtinPlayer")}
              </p>
              <HorizontalRow>
                {inTurnOrderAfter(winner).map((i) => (
                  <PlayerButton
                    key={i}
                    wind={seatWindOf(i)}
                    selected={i === dealIn}
                    onClick={() => change(i, ronCount, coWinner)}
                  />
                ))}
              </HorizontalRow>
              {ronCount > 1 && (
                <>
                  <p className="text-xl lg:text-2xl">{t("compass.winners")}</p>
                  <HorizontalRow>
                    {winnerCandidates.map((i) => (
                      <PlayerButton
                        key={i}
                        wind={seatWindOf(i)}
                        selected={winners.includes(i)}
                        forced={
                          i === winner || ronCount === winnerCandidates.length
                        }
                        onClick={() => change(dealIn, ronCount, i)}
                      />
                    ))}
                  </HorizontalRow>
                </>
              )}
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
          {settings.usePao && ronCount === 1 && (
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
          disabled={winners.length !== ronCount}
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
