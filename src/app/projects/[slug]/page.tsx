import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ArrowRight, FileJson, TriangleAlert } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { findProject, projectCategory, projectFile, projectNeighbours, projects } from "@/lib/projects";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

/** Every project is fixed content; any other slug is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = findProject((await params).slug);
  if (!project) return {};
  return { title: project.title, description: `${project.tagline} ${project.result}` };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = findProject((await params).slug);
  if (!project) notFound();
  const category = projectCategory(project.category);
  const file = projectFile(project.slug);
  const { previous, next } = projectNeighbours(project.slug);

  return (
    <>
      <SiteHeader />
      <main className="shell project-detail">
        <Link className="text-link detail-back" href={`/projects#${category.id}`}>
          <ArrowLeft size={15} aria-hidden="true" /> {category.title}
        </Link>

        <header className="project-heading">
          <h1>{project.title}</h1>
          <p className="project-tagline">{project.tagline}</p>
          <p className="project-nodes"><span className="sr-only">Main nodes: </span>{project.nodes.join(" · ")}</p>
        </header>

        <div className="project-layout">
          <div className="project-body">
            <section aria-labelledby="project-result">
              <h2 id="project-result">The end result</h2>
              <p>{project.result}</p>
            </section>

            <section aria-labelledby="project-how">
              <h2 id="project-how">How it works</h2>
              {project.howItWorks.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>

            <section aria-labelledby="project-needs">
              <h2 id="project-needs">You will need</h2>
              <ul className="project-needs">
                {project.needs.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>

            {project.tips && (
              <section aria-labelledby="project-tips">
                <h2 id="project-tips">Make it yours</h2>
                <ul className="project-tips">
                  {project.tips.map((tip) => <li key={tip}>{tip}</li>)}
                </ul>
              </section>
            )}

            {project.caution && (
              <p className="project-caution">
                <TriangleAlert size={18} aria-hidden="true" />
                <span>{project.caution}</span>
              </p>
            )}
          </div>

          <aside className="project-file" aria-labelledby="project-file-heading">
            <h2 id="project-file-heading">Project file</h2>
            <a className="button button-primary delivery-download" href={file.url} download={file.fileName}>
              <ArrowDownToLine size={17} aria-hidden="true" /> Download project
            </a>
            <p className="delivery-file"><FileJson size={14} aria-hidden="true" /> <span>{file.fileName}</span></p>
            <ol className="project-steps">
              <li>
                <strong>Open it in the app.</strong> In Design Studio for FastLED, choose File › Open Project File… and pick the file you downloaded.
              </li>
              <li>
                <strong>Follow the build instructions.</strong> The Build Diagram tab shows every wire, the power plan and the parts list for this project.
              </li>
              <li>
                <strong>Upload the firmware.</strong> Plug the board in over USB, open the Upload tab and upload.
              </li>
            </ol>
          </aside>
        </div>

        <nav className="project-pager" aria-label="More projects">
          {previous ? (
            <Link href={`/projects/${previous.slug}`} rel="prev">
              <span><ArrowLeft size={14} aria-hidden="true" /> Previous</span>
              <strong>{previous.title}</strong>
            </Link>
          ) : <span />}
          {next && (
            <Link className="project-pager-next" href={`/projects/${next.slug}`} rel="next">
              <span>Next <ArrowRight size={14} aria-hidden="true" /></span>
              <strong>{next.title}</strong>
            </Link>
          )}
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
