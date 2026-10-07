import clsx from "clsx";
import { HiCheck } from "react-icons/hi";

import { type Wind } from "../../lib/hand";
import TileButton from "../calculator/TileButton";

export default function PlayerButton({
  wind,
  selected,
  forced = false,
  disabled = false,
  onClick,
}: {
  wind: Wind;
  selected: boolean;
  forced?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={clsx(
        "relative m-1 rounded-xl",
        selected ? "ring-4 ring-amber-500 dark:ring-amber-600" : "opacity-40",
      )}
    >
      <TileButton
        tile={`${wind}z`}
        dora={selected}
        forced={forced}
        disabled={disabled}
        onClick={onClick}
      />
      {selected && (
        <span className="pointer-events-none absolute -top-2 -right-2 rounded-full bg-amber-500 p-0.5 text-sm text-black lg:text-lg dark:bg-amber-600 dark:text-white">
          <HiCheck />
        </span>
      )}
    </div>
  );
}
