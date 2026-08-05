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
  FileCode2,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PatternPreview } from "@/components/pattern-preview";
import { PatternRatingControl } from "@/components/pattern-rating-control";
import { StarRating } from "@/components/star-rating";
import { starterPatterns, type Pattern } from "@/lib/patterns";
import { getRatingStat, getViewerRating, viewerIsSignedIn } from "@/lib/pattern-ratings";
import { getPatternNeighbours, type PatternLink } from "@/lib/published-patterns";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PatternPageProps = { params: Promise<{ id: string }> };

type PatternDetail = Pattern & {
  downloadUrl?: string;
  fileName?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanFileName(storagePath: string) {
  const storedName = storagePath.split("/").pop() ?? "fastled-pattern.json";
  return storedName.replace(/^[0-9a-f-]{36}-/i, "");
}

const getPattern = cache(async (id: string): Promise<PatternDetail | null> => {
  const starterPattern = starterPatterns.find((pattern) => pattern.id === id);
  if (starterPattern) return starterPattern;
  if (!hasSupabaseConfig() || !uuidPattern.test(id)) return null;

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
  const fileName = cleanFileName(data.storage_path);
  // One signature covers both uses. The `download` option is not part of what
  // the token signs — it is a plain query parameter that asks storage for a
  // Content-Disposition — so the preview fetch and the download link are the
  // same URL, and signing the object twice per page render was pure overhead.
  const { data: signedFile } = await supabase.storage
    .from("pattern-files")
    .createSignedUrl(data.storage_path, 900);
  const previewSignedUrl = signedFile?.signedUrl;
  const downloadUrl = previewSignedUrl
    ? `${previewSignedUrl}&download=${encodeURIComponent(fileName)}`
    : undefined;

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
    downloadUrl,
    previewUrl: previewSignedUrl,
    fileName,
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
    <Link
      className={`pattern-step pattern-step-${direction}`}
      href={`/patterns/${target.id}`}
      aria-label={`${direction === "previous" ? "Previous" : "Next"} pattern: ${target.title}`}
      title={target.title}
    >
      <Icon size={20} aria-hidden="true" />
    </Link>
  );
}

export default async function PatternDetailPage({ params }: PatternPageProps) {
  const { id } = await params;
  const pattern = await getPattern(id);
  if (!pattern) notFound();
  const neighbours = await getPatternNeighbours(id);
  // Starter patterns are static fixtures with no database row, so there is
  // nothing to rate and no stats to read.
  const rateable = uuidPattern.test(id);
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
          <Link className="detail-back" href="/patterns"><ArrowLeft size={14} aria-hidden="true" /> Back to patterns</Link>
          <section className="detail-hero">
            <div className="detail-hero-copy">
              <p className="eyebrow"><span /> Community signal</p>
              <h1>{pattern.title}</h1>
              <p>{pattern.description}</p>
              <div className="detail-tags">{pattern.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </div>
            <div className="detail-preview-deck">
              <PatternStep direction="previous" target={neighbours.previous} />
              <div className="detail-preview-stage">
                <PatternPreview pattern={pattern} variant="detail" controls />
                {neighbours.total > 1 && (
                  <p className="detail-preview-step-note">
                    {neighbours.position > 0
                      ? <>Pattern {neighbours.position} of {neighbours.total} · use the arrows to step through the library</>
                      : <>Use the arrows to step through the library</>}
                  </p>
                )}
              </div>
              <PatternStep direction="next" target={neighbours.next} />
            </div>
          </section>

          <section className="detail-bench">
            <div className="detail-story">
              <p className="eyebrow"><span /> Project notes</p>
              <h2>Open the graph.<br />Make it yours.</h2>
              <p>{pattern.description}</p>
              <div className="detail-specs">
                <div><UserRound size={18} aria-hidden="true" /><span>Maker</span><strong>{pattern.author}</strong></div>
                <div><CalendarDays size={18} aria-hidden="true" /><span>Published</span><strong>{publishedDate}</strong></div>
                {pattern.studioScore != null && (
                  <div><Award size={18} aria-hidden="true" /><span>Studio Score</span><strong>{pattern.studioScore}/100</strong></div>
                )}
                {rateable && (
                  <div>
                    <Star size={18} aria-hidden="true" />
                    <span>Community</span>
                    <strong><StarRating rating={rating} size={15} /></strong>
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
            </div>

            <aside className="delivery-panel">
              <span className="delivery-label">Pattern delivery</span>
              <FileCode2 size={27} aria-hidden="true" />
              <h2>{pattern.fileName ?? "Source coming soon"}</h2>
              <p>{pattern.downloadUrl ? "A fresh, secure download link is ready for the approved source file." : "This curated example does not have a downloadable source file yet."}</p>
              {pattern.downloadUrl ? (
                <a className="button button-primary delivery-download" href={pattern.downloadUrl}>
                  <ArrowDownToLine size={17} aria-hidden="true" /> Download pattern
                </a>
              ) : (
                <Link className="button button-outline delivery-download" href="/patterns">Browse downloadable patterns</Link>
              )}
              <div className="delivery-safety"><ShieldCheck size={16} aria-hidden="true" /><span><strong>Bench check</strong>Read the source, confirm pin assignments, and set a safe current limit before flashing.</span></div>
            </aside>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
