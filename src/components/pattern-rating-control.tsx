"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { clearPatternRating, ratePattern, type RatingState } from "@/app/patterns/[id]/actions";

// The interactive half of the community rating: a radio group of five stars.
//
// Built as radios rather than buttons so the whole thing is one tab stop with
// arrow-key selection, which is what a screen reader user expects of a
// single-choice control. The visible stars are the radios' labels; the inputs
// themselves are visually hidden but still focusable.

const LABELS = ["Terrible", "Poor", "Fair", "Good", "Excellent"];

export function PatternRatingControl({
  patternId,
  initialStars,
  signedIn,
}: {
  patternId: string;
  /** The viewer's existing vote, so the control opens showing what they last
   *  submitted rather than an empty row. */
  initialStars: number | null;
  signedIn: boolean;
}) {
  const [stars, setStars] = useState<number | null>(initialStars);
  const [hovered, setHovered] = useState<number | null>(null);
  const [state, setState] = useState<RatingState>({ message: "", tone: "idle", stars: initialStars });
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <div className="rating-control is-signed-out">
        <p>
          <Link href="/login">Log in</Link> to rate this pattern.
        </p>
      </div>
    );
  }

  const submit = (next: number) => {
    // Optimistic, then reconciled: `state.stars` from the action is the
    // server's answer, and a rejected write resets the row below.
    setStars(next);
    startTransition(async () => {
      const result = await ratePattern(patternId, next);
      setState(result);
      if (result.tone === "error") setStars(initialStars);
      else setStars(result.stars);
    });
  };

  const clear = () => {
    setStars(null);
    startTransition(async () => {
      const result = await clearPatternRating(patternId);
      setState(result);
      if (result.tone === "error") setStars(initialStars);
      else setStars(result.stars);
    });
  };

  // What the stars paint right now: the hovered value while pointing, the
  // committed vote otherwise.
  const shown = hovered ?? stars ?? 0;

  return (
    <div className="rating-control">
      <fieldset disabled={pending} onMouseLeave={() => setHovered(null)}>
        <legend>Your rating</legend>
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className={value <= shown ? "is-on" : undefined}
              onMouseEnter={() => setHovered(value)}
            >
              <input
                type="radio"
                name={`rating-${patternId}`}
                value={value}
                checked={stars === value}
                onChange={() => submit(value)}
              />
              <Star size={26} fill={value <= shown ? "currentColor" : "none"} aria-hidden="true" />
              <span className="sr-only">{`${value} star${value === 1 ? "" : "s"} — ${LABELS[value - 1]}`}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="rating-status" role="status">
        {pending
          ? "Saving…"
          : state.message || (stars ? `You rated this ${stars}/5.` : "Pick a star to rate this pattern.")}
      </p>

      {stars !== null && !pending && (
        <button type="button" className="rating-clear" onClick={clear}>
          Remove my rating
        </button>
      )}
    </div>
  );
}
