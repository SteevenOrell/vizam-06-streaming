import type { Title } from "@/lib/content/types";
import { TitleCard } from "./title-card";

/** Responsive equal-size poster grid for index pages. */
export function TitleGrid({ titles, label }: { titles: Title[]; label: string }) {
  if (titles.length === 0) {
    return <p className="wrap py-10 text-bone-400">Nothing here yet.</p>;
  }
  return (
    <ul aria-label={label} className="wrap grid grid-cols-2 gap-x-4 gap-y-8 py-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {titles.map((t) => (
        <li key={t.slug}>
          <TitleCard title={t} />
        </li>
      ))}
    </ul>
  );
}
