import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChartColumn, Leaf, SlidersHorizontal } from "lucide-react";
import landingImage from "@/assets/coolbostonlanding.png";
import { SiteHeader } from "@/components/site/SiteHeader";

const FEATURES = [
  {
    title: "Explore",
    body: "See Boston’s heat landscape",
    icon: Leaf,
    tint: "bg-emerald-100/80 text-emerald-700",
  },
  {
    title: "Simulate",
    body: "Test green roofs, solar, and more",
    icon: SlidersHorizontal,
    tint: "bg-sky-100/80 text-sky-700",
  },
  {
    title: "Analyze",
    body: "Compare impact across the city",
    icon: ChartColumn,
    tint: "bg-orange-100/80 text-orange-600",
  },
];

export default function Landing() {
  return (
    <div className="bg-background">
      <section className="relative isolate flex min-h-dvh flex-col overflow-hidden">
        {/* Background photo. Decorative, so empty alt. */}
        <Image
          src={landingImage}
          alt=""
          fill
          preload
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover object-[70%_center]"
        />
        {/* Wash from the left so the copy stays legible over the sky. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-white/85 via-white/55 to-transparent md:via-white/40"
        />

        <SiteHeader current="home" />

        <main
          aria-label="Introduction"
          className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pb-16 md:px-12"
        >
          <p className="text-xs font-medium tracking-[0.3em] text-slate-600 uppercase">
            A cooler, healthier Boston
          </p>
          <h1 className="mt-6 text-6xl leading-[0.95] font-bold tracking-tighter text-slate-900 md:text-8xl">
            Rethink a
            <br />
            <span className="text-primary">Cooler</span> Boston
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-slate-600 md:text-xl">
            Explore Boston’s urban heat, test real-world interventions, and see how a greener city
            can make a cooler, healthier future.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/map"
              className="inline-flex items-center gap-3 rounded-full bg-slate-900 px-9 py-4 font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Explore the Map
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="#learn"
              className="inline-flex items-center rounded-full border border-slate-300 bg-white/40 px-9 py-4 font-medium text-slate-900 backdrop-blur-sm transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Learn More
            </Link>
          </div>

          <ul id="learn" className="mt-20 flex scroll-mt-8 flex-wrap gap-x-12 gap-y-6">
            {FEATURES.map(({ title, body, icon: Icon, tint }) => (
              <li key={title} className="flex max-w-44 items-start gap-4">
                <span className={`grid size-12 shrink-0 place-items-center rounded-full ${tint}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-medium text-slate-900">{title}</span>
                  <span className="mt-1 block text-sm leading-snug text-slate-600">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </main>
      </section>
    </div>
  );
}
