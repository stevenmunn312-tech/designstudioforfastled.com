import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPreviewBuilds } from "@/lib/preview-builds";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview builds",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function megabytes(size: number) {
  return `${Math.round(size / (1024 * 1024))} MB`;
}

/** An unlisted page of unreleased builds. The code in the URL is the name of
 *  a folder in the private bucket; an unknown code is an ordinary 404. */
export default async function PreviewBuildsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const builds = await listPreviewBuilds(code);
  if (builds.length === 0) notFound();

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <div className="page-masthead">
          <h1>Preview builds. <em>Not released yet.</em></h1>
          <p>
            These builds are for people we invited. Please do not share this link. Download the file for your computer, unpack it, and start the app from the unpacked folder.
          </p>
        </div>
        <ul>
          {builds.map((build) => (
            <li key={build.fileName}>
              <a className="text-link" href={`/preview/${code}/${build.fileName}`} download>
                <Download size={15} aria-hidden="true" /> {build.label}
              </a>{" "}
              <span>{build.fileName}, {megabytes(build.size)}</span>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
