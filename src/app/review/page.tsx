import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, Clock3, FileCode2, LockKeyhole } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PatternPreview } from "@/components/pattern-preview";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ReviewControls } from "./review-controls";
import { GeneratePreviewButton } from "./generate-preview-button";
import { ComputeStudioScoreButton } from "./compute-studio-score-button";
import { ManagePatterns, type ManagedPattern } from "./manage-patterns";

export const metadata: Metadata = {
  title: "Pattern review",
  description: "Inspect and moderate submitted FastLED patterns.",
};

export const dynamic = "force-dynamic";

type PendingPattern = {
  id: string;
  title: string;
  description: string;
  tags: string[] | null;
  storage_path: string;
  preview_colors: string[] | null;
  created_at: string;
  profiles: { display_name: string } | { display_name: string }[] | null;
  downloadUrl?: string;
  previewUrl?: string;
};

type MissingPreviewPattern = {
  id: string;
  title: string;
  storage_path: string;
  previewUrl?: string;
};

type MissingScorePattern = {
  id: string;
  title: string;
  storage_path: string;
  previewUrl?: string;
};

function AccessPanel({ signedIn }: { signedIn: boolean }) {
  return (
    <main className="shell review-access">
      <LockKeyhole size={28} aria-hidden="true" />
      <p className="eyebrow"><span /> Moderator access</p>
      <h1>{signedIn ? "This bench is reserved for reviewers." : "Log in to open the review bench."}</h1>
      <p>{signedIn ? "Your maker account is working, but it has not been assigned as a moderator." : "Only approved moderators can inspect private submissions."}</p>
      {!signedIn && <Link className="button button-primary" href="/login">Log in</Link>}
    </main>
  );
}

function originalFileName(storagePath: string) {
  const storedName = storagePath.split("/").pop() ?? "pattern file";
  return storedName.replace(/^[0-9a-f-]{36}-/i, "");
}

export default async function ReviewPage() {
  if (!hasSupabaseConfig()) {
    return <><SiteHeader /><AccessPanel signedIn={false} /><SiteFooter /></>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <><SiteHeader /><AccessPanel signedIn={false} /><SiteFooter /></>;
  }

  const { data: moderator } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!moderator) {
    return <><SiteHeader /><AccessPanel signedIn /><SiteFooter /></>;
  }

  const { data, error } = await supabase
    .from("patterns")
    .select("id,title,description,tags,storage_path,preview_colors,created_at,profiles(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const pendingPatterns = (data ?? []) as PendingPattern[];
  await Promise.all(pendingPatterns.map(async (pattern) => {
    const { data: signedFile } = await supabase.storage
      .from("pattern-files")
      .createSignedUrl(pattern.storage_path, 600, { download: originalFileName(pattern.storage_path) });
    const { data: previewFile } = await supabase.storage
      .from("pattern-files")
      .createSignedUrl(pattern.storage_path, 600);
    pattern.downloadUrl = signedFile?.signedUrl;
    pattern.previewUrl = previewFile?.signedUrl;
  }));

  const { data: missingPreviewData } = await supabase
    .from("patterns")
    .select("id,title,storage_path")
    .eq("status", "approved")
    .eq("published", true)
    .eq("archived", false)
    .is("preview_media_path", null)
    .order("created_at", { ascending: true });

  const missingPreviewPatterns = (missingPreviewData ?? []) as MissingPreviewPattern[];
  await Promise.all(missingPreviewPatterns.map(async (pattern) => {
    const { data: previewFile } = await supabase.storage
      .from("pattern-files")
      .createSignedUrl(pattern.storage_path, 600);
    pattern.previewUrl = previewFile?.signedUrl;
  }));

  const { data: missingScoreData } = await supabase
    .from("patterns")
    .select("id,title,storage_path")
    .eq("status", "approved")
    .eq("published", true)
    .eq("archived", false)
    .is("studio_score", null)
    .order("created_at", { ascending: true });

  const missingScorePatterns = (missingScoreData ?? []) as MissingScorePattern[];
  await Promise.all(missingScorePatterns.map(async (pattern) => {
    const { data: previewFile } = await supabase.storage
      .from("pattern-files")
      .createSignedUrl(pattern.storage_path, 600);
    pattern.previewUrl = previewFile?.signedUrl;
  }));

  // Every pattern in any state, archived included — the moderator select policy
  // returns all rows, unlike the public one. No signed URLs here: the manager
  // edits metadata and never needs the file itself.
  const { data: managedData } = await supabase
    .from("patterns")
    .select("id,title,description,tags,preview_colors,status,published,archived,studio_score,likes,downloads,created_at,profiles(display_name)")
    .order("created_at", { ascending: false });

  const managedPatterns: ManagedPattern[] = (managedData ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      tags: row.tags,
      preview_colors: row.preview_colors,
      status: row.status,
      published: row.published,
      archived: row.archived,
      studio_score: row.studio_score,
      likes: row.likes ?? 0,
      downloads: row.downloads ?? 0,
      created_at: row.created_at,
      author: profile?.display_name ?? "Community maker",
    };
  });

  return (
    <>
      <SiteHeader />
      <main className="shell review-page">
        <header className="review-masthead">
          <div>
            <p className="eyebrow"><span /> Moderator workbench</p>
            <h1>Inspect the signal<br /><em>before it travels.</em></h1>
            <p>Check the description, hardware notes, and source file. Approval publishes the pattern immediately.</p>
          </div>
          <div className="queue-readout" aria-label={`${pendingPatterns.length} patterns waiting`}>
            <span>Queue depth</span>
            <strong>{String(pendingPatterns.length).padStart(2, "0")}</strong>
            <div aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i className={index < pendingPatterns.length ? "lit" : ""} key={index} />)}</div>
          </div>
        </header>

        {error ? (
          <div className="review-empty error"><strong>Queue unavailable</strong><p>{error.message}</p></div>
        ) : pendingPatterns.length === 0 ? (
          <div className="review-empty"><strong>All signals clear.</strong><p>There are no patterns waiting for review.</p></div>
        ) : (
          <section className="review-list" aria-label="Patterns awaiting review">
            {pendingPatterns.map((pattern, index) => {
              const profile = Array.isArray(pattern.profiles) ? pattern.profiles[0] : pattern.profiles;
              const colors = pattern.preview_colors?.slice(0, 3) ?? ["#61e4ff", "#876bff", "#ff78b7"];
              const style = {
                "--review-a": colors[0] ?? "#61e4ff",
                "--review-b": colors[1] ?? "#876bff",
                "--review-c": colors[2] ?? "#ff78b7",
              } as CSSProperties;

              return (
                <article className="review-item" key={pattern.id} style={style}>
                  <div className="review-rail"><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
                  <div className="review-workbench">
                    <div className="review-signal" aria-hidden="true"><i /><i /><i /></div>
                    <div className="review-heading">
                      <div><span>Pending submission</span><h2>{pattern.title}</h2><p>by {profile?.display_name ?? "Community maker"}</p></div>
                      <time dateTime={pattern.created_at}><Clock3 size={13} aria-hidden="true" /> {new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(pattern.created_at))}</time>
                    </div>
                    <div className="review-specs">
                      <div><span>Tags</span><strong>{pattern.tags?.join(" · ") || "None"}</strong></div>
                    </div>
                    <p className="review-description">{pattern.description}</p>
                    <div className="review-live-preview">
                      <PatternPreview pattern={{
                        id: pattern.id,
                        title: pattern.title,
                        description: pattern.description,
                        author: profile?.display_name ?? "Community maker",
                        tags: pattern.tags ?? [],
                        colors: [colors[0] ?? "#32e5ff", colors[1] ?? "#4037ff", colors[2] ?? "#ef35ed"],
                        likes: 0,
                        downloads: 0,
                        createdAt: pattern.created_at,
                        previewUrl: pattern.previewUrl,
                      }} variant="card" />
                    </div>
                    <div className="review-file">
                      <FileCode2 size={19} aria-hidden="true" />
                      <div><span>Submitted source</span><strong>{originalFileName(pattern.storage_path)}</strong></div>
                      {pattern.downloadUrl ? <a href={pattern.downloadUrl}><ArrowDownToLine size={15} aria-hidden="true" /> Download to inspect</a> : <span>File unavailable</span>}
                    </div>
                    <ReviewControls patternId={pattern.id} />
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {missingPreviewPatterns.length > 0 && (
          <section className="backfill-section" aria-label="Published patterns missing a preview clip">
            <h2>Missing a looping preview clip</h2>
            <p>Shared before captured clips existed — the gallery falls back to live evaluation for these until one is generated here.</p>
            <ul className="backfill-list">
              {missingPreviewPatterns.map((pattern) => (
                <li key={pattern.id}>
                  <span>{pattern.title}</span>
                  <GeneratePreviewButton patternId={pattern.id} previewUrl={pattern.previewUrl} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {missingScorePatterns.length > 0 && (
          <section className="backfill-section" aria-label="Published patterns missing a Studio Score">
            <h2>Missing a Studio Score</h2>
            <p>The site computes this itself from the live graph rather than trusting a value the uploader&rsquo;s app sent along — run it here for anything published before the scorer existed.</p>
            <ul className="backfill-list">
              {missingScorePatterns.map((pattern) => (
                <li key={pattern.id}>
                  <span>{pattern.title}</span>
                  <ComputeStudioScoreButton patternId={pattern.id} previewUrl={pattern.previewUrl} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <ManagePatterns patterns={managedPatterns} />
      </main>
      <SiteFooter />
    </>
  );
}
