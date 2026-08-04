import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Heart } from "lucide-react";
import type { CSSProperties } from "react";
import type { Pattern } from "@/lib/patterns";
import { PatternPreviewMedia } from "./pattern-preview-media";
import { PatternPreviewPlaceholder } from "./pattern-preview-placeholder";
import { PatternCardEdit } from "./pattern-card-edit";

export function PatternCard({
  pattern,
  compact = false,
  isModerator = false,
}: {
  pattern: Pattern;
  compact?: boolean;
  /** Renders the edit control. Only a hint for what to show — every edit is
   *  authorised again by the database, so this cannot grant anything. */
  isModerator?: boolean;
}) {
  const style = {
    "--pattern-a": pattern.colors[0],
    "--pattern-b": pattern.colors[1],
    "--pattern-c": pattern.colors[2],
  } as CSSProperties;

  // The card used to *be* the link. It can't stay that way once a moderator
  // button lives on it: a button inside an anchor is invalid HTML and every
  // click would navigate. So the card is a plain element and the link is
  // stretched over it, which also keeps .pattern-card the direct grid child —
  // .featured-grid .pattern-card:last-child in globals.css depends on that, and
  // a wrapper would have made every card its own last-child and hidden them all
  // at the tablet breakpoint.
  return (
    <div className={`pattern-card${compact ? " compact" : ""}`} style={style}>
      <div className="pattern-preview">
        {pattern.previewMediaUrl ? (
          <PatternPreviewMedia pattern={pattern} variant="card" />
        ) : (
          <PatternPreviewPlaceholder pattern={pattern} />
        )}
        <span className="preview-device">{pattern.controller} · {pattern.ledCount} LEDs</span>
      </div>
      <div className="pattern-copy">
        <div className="pattern-heading">
          <div>
            <h3>{pattern.title}</h3>
            <p>by {pattern.author}</p>
          </div>
          <span className="pattern-likes"><Heart size={14} aria-hidden="true" /> {pattern.likes}</span>
        </div>
        {!compact && <p className="pattern-description">{pattern.description}</p>}
        <div className="pattern-meta">
          <div>{pattern.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <span><ArrowDownToLine size={14} aria-hidden="true" /> {pattern.downloads.toLocaleString()} <ArrowUpRight className="pattern-open" size={13} aria-hidden="true" /></span>
        </div>
      </div>
      <Link className="pattern-card-link" href={`/patterns/${pattern.id}`} aria-label={`View ${pattern.title} pattern`} />
      {isModerator && (
        <PatternCardEdit
          pattern={{
            id: pattern.id,
            title: pattern.title,
            description: pattern.description,
            controller: pattern.controller,
            ledCount: pattern.ledCount,
            tags: pattern.tags,
            colors: pattern.colors,
            studioScore: pattern.studioScore ?? null,
            // Approved, published and unarchived by construction — that is
            // exactly what getPublishedPatterns filters on — so these are facts
            // rather than assumptions. The form can still change either.
            status: "approved",
            published: true,
            likes: pattern.likes,
            downloads: pattern.downloads,
          }}
        />
      )}
    </div>
  );
}
