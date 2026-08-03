import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Heart } from "lucide-react";
import type { CSSProperties } from "react";
import type { Pattern } from "@/lib/patterns";
import { PatternPreview } from "./pattern-preview";
import { PatternPreviewMedia } from "./pattern-preview-media";

export function PatternCard({ pattern, compact = false }: { pattern: Pattern; compact?: boolean }) {
  const style = {
    "--pattern-a": pattern.colors[0],
    "--pattern-b": pattern.colors[1],
    "--pattern-c": pattern.colors[2],
  } as CSSProperties;

  return (
    <Link className={`pattern-card${compact ? " compact" : ""}`} href={`/patterns/${pattern.id}`} style={style} aria-label={`View ${pattern.title} pattern`}>
      <div className="pattern-preview">
        {pattern.previewMediaUrl ? (
          <PatternPreviewMedia pattern={pattern} variant="card" />
        ) : (
          <PatternPreview pattern={pattern} variant="card" />
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
    </Link>
  );
}
