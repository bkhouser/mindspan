"use client";

import Image from "next/image";
import type { MediaDescriptor } from "@/domain/types";

export function MediaPrompt({ media, onReady }: { media: MediaDescriptor; onReady?: () => void }) {
  if (media.kind === "image") return <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-black/20"><Image alt={media.altText} className="object-contain" fill onLoad={onReady} sizes="(max-width: 768px) 100vw, 768px" src={media.signedUrl} unoptimized /></div>;
  if (media.kind === "audio") return <audio aria-label={media.altText} className="w-full" controls onCanPlay={onReady} src={media.signedUrl}>Your browser does not support audio.</audio>;
  return <video aria-label={media.altText} className="max-h-80 w-full rounded-2xl bg-black" controls onCanPlay={onReady} src={media.signedUrl}>Your browser does not support video.</video>;
}
