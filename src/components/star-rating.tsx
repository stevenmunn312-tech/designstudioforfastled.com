import { Star } from "lucide-react";
import type { PatternRating } from "@/lib/patterns";

// Read-only star display, shared by the gallery card and the detail page.
// The interactive input is a separate client component
// (pattern-rating-control.tsx) — this one stays a server component so a card
// grid does not ship JS per pattern just to draw five icons.

/**
 * Fractional fill is done with a clipped overlay rather than by rounding to
 * the nearest star or half-star: at low vote counts rounding misrepresents the
 * number badly (a lone 3-star vote reading as 3, then jumping to 4 on a
 * second), and the numeric average sits right beside it, so a visibly
 * mismatched row of stars looks like a bug.
 */
export function StarRating({
  rating,
  size = 14,
  showCount = true,
}: {
  rating: PatternRating | undefined;
  size?: number;
  /** Hide the "(n)" when the surrounding copy already says it. */
  showCount?: boolean;
}) {
  if (!rating || rating.votes === 0) {
    return <span className="star-rating is-unrated">Not yet rated</span>;
  }

  const percent = (rating.average / 5) * 100;

  return (
    <span
      className="star-rating"
      title={`${rating.average.toFixed(2)} out of 5 from ${rating.votes} ${rating.votes === 1 ? "vote" : "votes"}`}
    >
      <span className="star-rating-stars" aria-hidden="true">
        <span className="star-rating-track">
          {Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} />)}
        </span>
        <span className="star-rating-fill" style={{ width: `${percent}%` }}>
          {Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} fill="currentColor" />)}
        </span>
      </span>
      <span className="star-rating-value">
        {rating.average.toFixed(1)}
        {showCount && <em>({rating.votes})</em>}
      </span>
      <span className="sr-only">
        {rating.average.toFixed(2)} out of 5 stars from {rating.votes} {rating.votes === 1 ? "vote" : "votes"}
      </span>
    </span>
  );
}
