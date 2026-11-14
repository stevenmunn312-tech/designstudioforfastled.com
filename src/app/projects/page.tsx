import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { projectCategories, projectsIn } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Thirty example builds for Design Studio for FastLED, from a fake-occupancy TV to a thunderstorm vivarium. Each comes with a parts list and a project file you open in the app, wire up and upload.",
};

export default function ProjectsPage() {
  return (
    <>
      <SiteHeader />
      <main className="shell projects-page">
        <div className="page-masthead">
          <h1>Projects. <em>Practical builds, each with a twist.</em></h1>
          <p>
            Every project here comes with a parts list and a ready-made project file. Open the file in Design Studio for FastLED, follow its build instructions, then upload the firmware to your board.
          </p>
        </div>

        {projectCategories.map((category) => (
          <section className="project-category" aria-labelledby={`category-${category.id}`} id={category.id} key={category.id}>
            <header className="project-category-heading">
              <h2 id={`category-${category.id}`}>{category.title}</h2>
              <p>{category.intro}</p>
            </header>
            <ul className="project-list">
              {projectsIn(category.id).map((project) => (
                <li key={project.slug}>
                  <Link className="project-card" href={`/projects/${project.slug}`}>
                    <span className="project-card-nodes">{project.nodes.join(" · ")}</span>
                    <span className="project-card-title">{project.title}</span>
                    <span className="project-card-tagline">{project.tagline}</span>
                    <span className="project-card-more" aria-hidden="true">
                      View project <ArrowRight size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
