import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
  };
}

function getSnapshot() {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Math.min(window.innerWidth, window.innerHeight) / rem;
}

/** The shorter side of the visible viewport, in rem. */
export default function useViewportShortSide(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}
