import type { Metadata } from "next";
import { PageIntro, StubNotice } from "@/components/layout/page-intro";
import { getLicences } from "@/lib/content/catalog";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "About AFTERLIGHT, a VIZAM concept project, and the licences of every film it shows.",
};

export default function AboutPage() {
  const licences = getLicences();
  return (
    <>
      <PageIntro eyebrow="A VIZAM concept project" title="About AFTERLIGHT">
        {site.name} is a fictional streaming and film-discovery site designed and built by {site.studio} for its
        portfolio. It is not a real service, has no subscriptions and sells nothing. It shows only films released under
        Creative Commons licences, in the public domain, or explicitly licensed for this use.
      </PageIntro>
      <section aria-labelledby="licences" className="wrap py-8">
        <h2 id="licences" className="scroll-mt-24 text-2xl font-extrabold text-bone-50">
          Film licences and credits
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {licences.map((l) => (
            <li key={l.titleSlug} className="rounded-card bg-ink-900 p-5 ring-1 ring-inset ring-white/5">
              <p className="font-bold text-bone-50">{l.titleName}</p>
              <p className="mt-1 text-sm text-bone-200">{l.attribution}</p>
              <p className="mt-2 text-xs text-bone-400">
                By {l.author} ·{" "}
                <a href={l.url} className="underline decoration-ember-400/60 underline-offset-2 hover:text-ember-300" rel="noopener noreferrer" target="_blank">
                  {l.name}
                </a>{" "}
                ·{" "}
                <a href={l.sourceUrl} className="underline decoration-ember-400/60 underline-offset-2 hover:text-ember-300" rel="noopener noreferrer" target="_blank">
                  Source
                </a>
                {l.modifications ? ` · Changes: ${l.modifications}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <StubNotice phase="Phase 4" />
    </>
  );
}
