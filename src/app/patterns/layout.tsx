import type { ReactNode } from "react";
import { AudioDockProvider } from "@/lib/audio-dock";

/**
 * Wraps the gallery and every pattern detail route. Next preserves layout state
 * across navigation, so the audio session mounted here survives stepping from
 * one pattern to the next — the track keeps playing instead of being reloaded.
 */
export default function PatternsLayout({ children }: { children: ReactNode }) {
  return <AudioDockProvider>{children}</AudioDockProvider>;
}
