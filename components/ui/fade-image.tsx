"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = Omit<ImageProps, "placeholder" | "blurDataURL"> & {
  /** Tiny base64 blur placeholder (<= 4 KB). Without it the veil is the surface colour. */
  blur?: string;
};

/**
 * next/image with a veil that fades out once the real image has loaded (no flash, no layout shift).
 * The veil shows the blur placeholder; it sits above the image inside the parent (use with `fill` or any positioned
 * parent) and is removed without JS (`@media (scripting: none)`) and under reduced motion (instant). See `.img-veil`.
 */
export function FadeImage({ blur, onLoad, alt, ...props }: Props) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <>
      <Image
        ref={ref}
        {...props}
        alt={alt}
        placeholder="empty"
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
      />
      <span aria-hidden="true" data-loaded={loaded} className="img-veil" style={blur ? { backgroundImage: `url(${blur})` } : undefined} />
    </>
  );
}
