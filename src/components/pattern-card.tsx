import { ArrowDownToLine, Heart } from "lucide-react";
import type { CSSProperties } from "react";
import type { Pattern } from "@/lib/patterns";

export function PatternCard({ pattern, compact = false }: { pattern: Pattern; compact?: boolean }) {
  const style = {
    "--pattern-a": pattern.colors[0],
    "--pattern-b": pattern.colors[1],
    "--pattern-c": pattern.colors[2],
  } as CSSProperties;

  return (
    <article className={`pattern-card${compact ? " compact" : ""}`} style={style}>
      <div className="pattern-preview" aria-hidden="true">
        <div className="preview-beam beam-one" />
        <div className="preview-beam beam-two" />
        <div className="preview-pixels">
          {Array.from({ length: 36 }, (_, index) => <i key={index} />)}
        </div>
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
          <span><ArrowDownToLine size={14} aria-hidden="true" /> {pattern.downloads.toLocaleString()}</span>
        </div>
      </div>
    </article>
  );
}
