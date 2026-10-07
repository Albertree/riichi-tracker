import clsx from "clsx";
import { type ReactNode } from "react";

/** Looks like Toggle, but neither side has to be chosen: clicking the active side clears it. */
export default function ToggleOptional({
  toggled,
  left,
  right,
  onToggle,
}: {
  toggled: 0 | 1 | null;
  left: ReactNode;
  right: ReactNode;
  onToggle?: (toggled: 0 | 1 | null) => void;
}) {
  return (
    <div className="flex h-10 w-52 flex-row text-xl lg:h-14 lg:w-80 lg:text-2xl">
      {([0, 1] as const).map((side) => (
        <button
          key={side}
          className={clsx(
            "flex w-1/2 items-center justify-center rounded-xl border border-gray-800 p-1 shadow disabled:bg-gray-300 lg:p-2 dark:disabled:bg-gray-800 dark:disabled:text-gray-600",
            side === 0 ? "rounded-r-none" : "rounded-l-none",
            toggled === side
              ? "bg-amber-500 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-800"
              : "bg-gray-50 hover:bg-gray-200 dark:bg-gray-500 dark:hover:bg-gray-600",
          )}
          onClick={
            onToggle
              ? (e) => {
                  e.preventDefault();
                  onToggle(toggled === side ? null : side);
                }
              : undefined
          }
        >
          {side === 0 ? left : right}
        </button>
      ))}
    </div>
  );
}
