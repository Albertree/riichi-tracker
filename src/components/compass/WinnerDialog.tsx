import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { type Game } from "../../data/interfaces";
import { nextWind } from "../../lib/hand";
import { type CalculatorState } from "../../lib/states";
import Button from "../Button";
import CustomDialog from "../layout/CustomDialog";
import HorizontalRow from "../layout/HorizontalRow";
import H from "../text/H";
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
  // East first, the way the seats are usually read out.
  const inSeatOrder = playerIxes
    .slice()
    .sort((a, b) => Number(seatWindOf(a)) - Number(seatWindOf(b)));
  // Someone has to deal in, and three winners is a draw when sanchahou is on.
  const canTripleRon = !isSanma && !settings.sanchahou;

  const [isRon, setIsRon] = useState(false);
  const [dealIn, setDealIn] = useState<number | null>(null);
  // Only ron can have more than one winner.
  const [ronCount, setRonCount] = useState<1 | 2 | 3>(1);
  const [coWinner, setCoWinner] = useState<number | null>(null);
  const [handleRotation, setHandleRotation] = useState(seatWind !== "1");
  const [dealerRepeat, setDealerRepeat] = useState(seatWind === "1");
  const [scoreRiichiSticks, setScoreRiichiSticks] = useState(true);
  const [scoreRepeatSticks, setScoreRepeatSticks] = useState(true);
  const [isPao, setIsPao] = useState(false);
  const [paoPlayer, setPaoPlayer] = useState<number | null>(null);
  // Whether to show what is still missing, once calculating has been tried.
  const [attempted, setAttempted] = useState(false);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  // Closest to the dealt-in player first, which is also who takes the riichi sticks.
  const winnersFor = (
    dealIn_: number | null,
    ronCount_: 1 | 2 | 3,
    coWinner_: number | null,
  ) => {
    if (ronCount_ === 1) {
      return [winner];
    }
    if (dealIn_ == null) {
      return inSeatOrder.filter((i) => i === winner || i === coWinner_);
    }
    const candidates = inTurnOrderAfter(dealIn_);
    // Everyone but the dealt-in player won, so there is nobody left to pick.
    return ronCount_ === candidates.length
      ? candidates
      : candidates.filter((i) => i === winner || i === coWinner_);
  };
  const winners = winnersFor(dealIn, ronCount, coWinner);
  const winnerCandidates =
    dealIn == null ? inSeatOrder : inTurnOrderAfter(dealIn);
  const dealerWins = winners.some((i) => seatWindOf(i) === "1");
  const paoCandidates = inSeatOrder.filter((i) => i !== winner && i !== dealIn);
  const error = !isRon
    ? null
    : dealIn == null
      ? t("compass.error.pickDealtIn")
      : winners.length !== ronCount
        ? t("compass.error.pickWinners", { winners: ronCount })
        : null;

  const changeRon = (
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
    setDealIn(dealIn_);
    setRonCount(ronCount_);
    setCoWinner(coWinner_);
    setDealerRepeat(dealerWins_);
    setHandleRotation(!dealerWins_);
    if (ronCount_ > 1 || (dealIn_ != null && paoPlayer === dealIn_)) {
      setIsPao(false);
      setPaoPlayer(null);
    }
  };

  const submitWinner = () => {
    if (error != null) {
      setAttempted(true);
      // The button sits at the end of a long dialog, so bring the message into view.
      requestAnimationFrame(() =>
        errorRef.current?.scrollIntoView({ block: "nearest" }),
      );
      return;
    }
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
    if (!isRon || dealIn == null) {
      state = { ...common, winner, seatWind, agari: "tsumo" };
    } else {
      const [first, ...rest] = winners;
      state = {
        ...common,
        winner: first,
        seatWind: seatWindOf(first),
        agari: "ron",
        dealtInPlayer: dealIn,
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
            toggled={isRon}
            onToggle={(b) => {
              setIsRon(b);
              changeRon(null, 1, null);
            }}
            left={t("common.tsumo")}
            right={t("common.ron")}
          />
          {isRon && (
            <>
              <p className="text-xl lg:text-2xl">{t("compass.multipleRon")}</p>
              {canTripleRon ? (
                <ToggleOptional
                  toggled={ronCount === 1 ? null : ronCount === 2 ? 0 : 1}
                  onToggle={(side) =>
                    changeRon(
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
                  onToggle={(b) => changeRon(dealIn, b ? 2 : 1, coWinner)}
                >
                  {t("compass.doubleRon")}
                </ToggleOnOff>
              )}
              <p className="text-xl lg:text-2xl">
                {t("compass.dealtinPlayer")}
              </p>
              <HorizontalRow>
                {inSeatOrder
                  .filter((i) => i !== winner)
                  .map((i) => (
                    <PlayerButton
                      key={i}
                      wind={seatWindOf(i)}
                      selected={i === dealIn}
                      onClick={() => changeRon(i, ronCount, coWinner)}
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
                          i === winner ||
                          (dealIn != null &&
                            ronCount === winnerCandidates.length)
                        }
                        onClick={() => changeRon(dealIn, ronCount, i)}
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
        <div className="flex flex-col items-center justify-center gap-y-2">
          <Button
            onClick={() => {
              void submitWinner();
            }}
          >
            {t("compass.calculateHand")}
          </Button>
          {attempted && error != null && (
            <p ref={errorRef} className="text-base lg:text-xl">
              <H.Red>{error}</H.Red>
            </p>
          )}
        </div>
      </div>
    </CustomDialog>
  );
}
