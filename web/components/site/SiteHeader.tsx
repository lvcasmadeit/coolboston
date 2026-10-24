import Link from "next/link";
import { ArrowRight, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";

export type SitePage = "home" | "about";

const NAV_LINKS: { href: string; label: string; page?: SitePage }[] = [{ href: "/about", label: "About", page: "about" }];

/** Header for the marketing pages (landing, about). The map has its own TopBar. */
export function SiteHeader({ current }: { current: SitePage }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center gap-10 px-6 py-6 md:px-12">
      <Link href="/" className="flex items-center gap-2" aria-label="CoolBoston home">
        <Thermometer className="size-7 text-orange-500" aria-hidden />
        <span className="text-xl font-semibold tracking-tight text-slate-900">CoolBoston</span>
      </Link>
      <nav aria-label="Primary" className="hidden md:block">
        <ul className="flex items-center gap-10 text-sm text-slate-600">
          {NAV_LINKS.map((link) => {
            const active = link.page === current;
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "border-b-2 py-1 transition-colors hover:text-slate-900",
                    active ? "border-slate-900 text-slate-900" : "border-transparent",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <LaunchMapLink className="ml-auto px-6 py-3 text-sm" />
    </header>
  );
}

/** Dark pill linking to the map. Used in the header and page CTAs. */
export function LaunchMapLink({
  className,
  label = "Launch Map",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href="/map"
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-slate-900 font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
        className,
      )}
    >
      {label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}
