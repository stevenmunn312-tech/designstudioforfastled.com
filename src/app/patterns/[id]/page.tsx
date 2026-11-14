import { cache, type CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
  Award,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileJson,
  Star,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PatternStage } from "@/components/pattern-stage";
import { PatternRatingControl } from "@/components/pattern-rating-control";
import { StarRating } from "@/components/star-rating";
import { findBuiltInPattern, type Pattern } from "@/lib/patterns";
import { getRatingStat, getViewerRating, viewerIsSignedIn } from "@/lib/pattern-ratings";
import { isStoredPatternId, patternFileName } from "@/lib/pattern-files";
import { getPatternNeighbours, type PatternLink } from "@/lib/published-patterns";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PatternPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ download?: string | string[] }>;
};

type PatternDetail = Pattern & {
  /** Set only for stored patterns, which the download route can sign. */
  fileName?: string;
  /** Set only for built-in patterns, whose file is a static asset. */
  download?: { url: string; fileName: string };
};

const getPattern = cache(async (id: string): Promise<PatternDetail | null> => {
  const builtIn = findBuiltInPattern(id);
  if (builtIn) return builtIn;
  if (!hasSupabaseConfig() || !isStoredPatternId(id)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patterns")
    .select("id,title,description,tags,preview_colors,likes,downloads,created_at,storage_path,studio_score,profiles(display_name)")
    .eq("id", id)
    .eq("published", true)
    // See getPublishedPatterns: RLS alone still shows an archived pattern to
    // its owner and to moderators, and an archived pattern should 404.
    .eq("archived", false)
    .maybeSingle();

  if (error || !data) return null;

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const colors = Array.isArray(data.preview_colors) && data.preview_colors.length >= 3
    ? data.preview_colors.slice(0, 3) as [string, string, string]
    : ["#61e4ff", "#876bff", "#ff78b7"] as [string, string, string];
  // The live preview fetches the graph as soon as the page loads, so this URL
  // is used within seconds. Downloads are signed separately at click time by
  // ./download/route.ts, because a visitor may sit on the page past expiry.
  const { data: signedFile } = await supabase.storage
    .from("pattern-files")
    .createSignedUrl(data.storage_path, 900);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    author: profile?.display_name ?? "Community maker",
    tags: data.tags ?? [],
    colors,
    likes: data.likes ?? 0,
    downloads: data.downloads ?? 0,
    createdAt: data.created_at,
    previewUrl: signedFile?.signedUrl,
    fileName: patternFileName(data.storage_path),
    studioScore: data.studio_score ?? undefined,
  };
});

export async function generateMetadata({ params }: PatternPageProps): Promise<Metadata> {
  const { id } = await params;
  const pattern = await getPattern(id);
  if (!pattern) return { title: "Pattern not found" };

  return {
    title: pattern.title,
    description: pattern.description,
    openGraph: {
      title: `${pattern.title} · Design Studio for FastLED`,
      description: pattern.description,
      type: "article",
      publishedTime: pattern.createdAt,
      authors: [pattern.author],
    },
  };
}

/** One side of the preview. Renders as plain, non-focusable text at the ends of
 *  the gallery so the arrow keeps its place in the layout without offering a
 *  link that goes nowhere. */
function PatternStep({ direction, target }: { direction: "previous" | "next"; target: PatternLink | null }) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  if (!target) {
    return (
      <span className={`pattern-step pattern-step-${direction} is-spent`} aria-hidden="true">
        <Icon size={20} />
      </span>
    );
  }

  return (
    // scroll={false}: stepping is browsing in place. Next otherwise scrolls a
    // page whose top is off-screen back to the top. PatternStage keeps the
    // matrix where it was (see keepStageInPlace).
    <Link
      className={`pattern-step pattern-step-${direction}`}
      href={`/patterns/${target.id}`}
      scroll={false}
      aria-label={`${direction === "previous" ? "Previous" : "Next"} pattern: ${target.title}`}
      title={target.title}
    >
      <Icon size={20} aria-hidden="true" />
    </Link>
  );
}

export default async function PatternDetailPage({ params, searchParams }: PatternPageProps) {
  const { id } = await params;
  const pattern = await getPattern(id);
  if (!pattern) notFound();
  const neighbours = await getPatternNeighbours(id);
  const downloadFailed = (await searchParams).download === "failed";
  // Built-in patterns are static files with no database row, so there is
  // nothing to rate and no stats to read.
  const rateable = isStoredPatternId(id);
  const [rating, viewerStars, signedIn] = rateable
    ? await Promise.all([getRatingStat(id), getViewerRating(id), viewerIsSignedIn()])
    : [undefined, null, false];

  const style = {
    "--detail-a": pattern.colors[0],
    "--detail-b": pattern.colors[1],
    "--detail-c": pattern.colors[2],
  } as CSSProperties;
  const publishedDate = new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(new Date(pattern.createdAt));

  return (
    <>
      <SiteHeader />
      <main className="pattern-detail" style={style}>
        <div className="shell">
          <Link className="text-link detail-back" href="/patterns"><ArrowLeft size={15} aria-hidden="true" /> Back to patterns</Link>
          <header className="detail-heading">
            <h1>{pattern.title}</h1>
            <p className="detail-byline">by {pattern.author}</p>
            {pattern.description && <p className="detail-note">{pattern.description}</p>}
          </header>
          <PatternStage
            pattern={pattern}
            previousStep={<PatternStep direction="previous" target={neighbours.previous} />}
            nextStep={<PatternStep direction="next" target={neighbours.next} />}
            stepNote={neighbours.total > 1 && (
              <span>
                {neighbours.position > 0
                  ? <>Pattern {neighbours.position} of {neighbours.total} · step with the arrows</>
                  : <>Step through the library with the arrows</>}
              </span>
            )}
            rail={
              <div className="stage-rail">
                <div className="stage-rail-facts">
                  <div><CalendarDays size={15} aria-hidden="true" /><span>Published</span><strong>{publishedDate}</strong></div>
                  {pattern.studioScore != null && (
                    <div><Award size={15} aria-hidden="true" /><span>Studio Score</span><strong>{pattern.studioScore}/100</strong></div>
                  )}
                  {rateable && (
                    <div>
                      <Star size={15} aria-hidden="true" />
                      <span>Community</span>
                      <strong><StarRating rating={rating} size={13} /></strong>
                    </div>
                  )}
                </div>
                {rateable && (
                  <PatternRatingControl
                    patternId={pattern.id}
                    initialStars={viewerStars}
                    signedIn={signedIn}
                  />
                )}
                <div className="stage-rail-delivery">
                  {pattern.download ? (
                    <>
                      <a className="button button-primary delivery-download" href={pattern.download.url} download={pattern.download.fileName}>
                        <ArrowDownToLine size={17} aria-hidden="true" /> Download pattern
                      </a>
                      <p className="delivery-file"><FileJson size={14} aria-hidden="true" /> <span>{pattern.download.fileName}</span></p>
                    </>
                  ) : pattern.fileName ? (
                    <>
                      <a className="button button-primary delivery-download" href={`/patterns/${pattern.id}/download`}>
                        <ArrowDownToLine size={17} aria-hidden="true" /> Download pattern
                      </a>
                      <p className="delivery-file"><FileJson size={14} aria-hidden="true" /> <span>{pattern.fileName}</span></p>
                      {downloadFailed && (
                        <p className="delivery-error" role="alert">That download link could not be created. Try the button again in a moment.</p>
                      )}
                    </>
                  ) : (
                    <Link className="button button-quiet delivery-download" href="/patterns">Browse downloadable patterns</Link>
                  )}
                </div>
              </div>
            }
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
