import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="wrap grid min-h-[60vh] place-content-center py-20 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="display mt-3 text-6xl text-bone-50 sm:text-8xl">Lost in the dark</h1>
      <p className="mx-auto mt-4 max-w-md text-bone-200">This page faded out. The title may have moved, or the link is mistyped.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to Home</ButtonLink>
        <ButtonLink href="/search" variant="secondary">
          Search the library
        </ButtonLink>
      </div>
    </div>
  );
}
