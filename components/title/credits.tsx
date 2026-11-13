import type { Title } from "@/lib/content/types";

/** Directors, cast and writers. Empty groups are not rendered at all; returns null when there are no credits. */
export function Credits({ title }: { title: Title }) {
  const groups = [
    { label: title.credits.directors.length === 1 ? "Director" : "Directors", people: title.credits.directors },
    { label: "Cast", people: title.credits.cast },
    { label: title.credits.writers.length === 1 ? "Writer" : "Writers", people: title.credits.writers },
  ].filter((g) => g.people.length > 0);
  if (!groups.length) return null;
  return (
    <section aria-labelledby="credits-heading" data-testid="credits">
      <p className="eyebrow flex items-center gap-2 before:h-3.5 before:w-1 before:rounded-full before:bg-ember-400">Credits</p>
      <h2 id="credits-heading" className="mt-1.5 text-xl font-extrabold tracking-tight text-bone-50 sm:text-2xl">
        Cast and crew
      </h2>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {groups.map((g) => (
          <div key={g.label}>
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-bone-400">{g.label}</dt>
            <dd className="mt-1.5">
              <ul className="grid gap-1">
                {g.people.map((p) => (
                  <li key={`${p.slug}-${p.role ?? ""}`} className="text-bone-50">
                    {p.name}
                    {p.role ? <span className="text-bone-400"> as {p.role}</span> : null}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
