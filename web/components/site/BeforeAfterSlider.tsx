"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { ChevronsLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SlideImage = { src: StaticImageData; alt: string };

/**
 * Two aligned images stacked; the "before" image is clipped to the left of the
 * divider. A native range input covers the whole frame, so dragging, clicking
 * and the arrow keys all work and screen readers announce the position.
 * Both images must share the same dimensions for the comparison to line up.
 */
export function BeforeAfterSlider({
  before,
  after,
  label,
  initial = 50,
  className,
}: {
  before: SlideImage;
  after: SlideImage;
  label: string;
  initial?: number;
  className?: string;
}) {
  const [position, setPosition] = useState(initial);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-white/50 ring-1 ring-slate-900/5 select-none",
        className,
      )}
    >
      <Image
        src={after.src}
        alt={after.alt}
        placeholder="blur"
        sizes="(min-width: 1024px) 55vw, 100vw"
        className="block h-auto w-full"
      />
      <Image
        src={before.src}
        alt={before.alt}
        placeholder="blur"
        sizes="(min-width: 1024px) 55vw, 100vw"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={`${position}% before, ${100 - position}% after`}
        className="absolute inset-0 z-10 h-full w-full cursor-ew-resize appearance-none opacity-0"
      />

      {/* Divider and handle: visual only; the range input above takes the input. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgb(15_23_42/0.1)]"
        style={{ left: `${position}%` }}
      >
        <span className="absolute top-1/2 left-1/2 grid size-10 -translate-1/2 place-items-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-900/10 group-has-[input:focus-visible]:outline-2 group-has-[input:focus-visible]:outline-offset-2 group-has-[input:focus-visible]:outline-slate-900">
          <ChevronsLeftRight className="size-5" />
        </span>
      </div>
    </div>
  );
}
