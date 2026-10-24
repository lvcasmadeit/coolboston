import Link from "next/link";
import { Thermometer } from "lucide-react";
import { ViewControls } from "@/components/ViewControls";

export function TopBar() {
  return (
    <header className="flex h-12 items-center gap-4 border-b border-border bg-card px-4">
      <Link href="/" className="flex items-center gap-2" aria-label="CoolBoston home">
        <Thermometer className="size-5 text-orange-500" aria-hidden />
        <span className="font-semibold tracking-tight">CoolBoston</span>
        <span className="hidden text-sm text-muted-foreground md:inline">
          | Urban Heat Island Explorer
        </span>
      </Link>
      <span className="text-sm text-muted-foreground">Boston, MA</span>
      <div className="ml-auto">
        <ViewControls />
      </div>
    </header>
  );
}
