import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stand-in for an illustration that has not been made yet. `label` names the
 * intended asset; it is the accessible name now and the alt text later.
 */
export function AssetPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/50 p-4 text-center",
        className,
      )}
    >
      <span className="flex flex-col items-center gap-2 text-xs text-slate-500" aria-hidden>
        <ImageIcon className="size-5" />
        {label}
      </span>
    </div>
  );
}
