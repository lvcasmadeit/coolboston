import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Building2, ChartColumn, Layers, Leaf, Satellite, Sun } from "lucide-react";
import skylineImage from "@/assets/coolbostonlanding.png";
import { AssetPlaceholder } from "@/components/site/AssetPlaceholder";
import { LaunchMapLink, SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "About | CoolBoston",
  description:
    "Why Boston gets so hot, how CoolBoston works, and the data and models behind its estimates.",
};

type Card = { title: string; body: string; icon: LucideIcon; tint: string };

const CHALLENGES: Card[] = [
  {
    title: "Heat absorption",
    body: "Concrete, asphalt, and rooftops absorb and store solar energy.",
    icon: Sun,
    tint: "bg-orange-100 text-orange-500",
  },
  {
    title: "Less vegetation",
    body: "Fewer trees means less shade and evaporative cooling.",
    icon: Leaf,
    tint: "bg-emerald-100 text-primary",
  },
  {
    title: "Stored heat",
    body: "Urban materials release accumulated heat into the evening, keeping cities warmer for longer.",
    icon: Building2,
    tint: "bg-sky-100 text-sky-700",
  },
];

const STEPS = [
  {
    title: "Explore urban heat",
    body: "Visualize how heat intensity varies across Boston using measured temperature data and an interactive 3D map.",
    asset: "Illustration: heat-coloured city grid",
    tint: "bg-sky-100 text-sky-700",
  },
  {
    title: "Design interventions",
    body: "Select buildings or neighborhoods and experiment with green roofs, solar panels, cool roofs, and more.",
    asset: "Illustration: building with a green roof",
    tint: "bg-emerald-100 text-primary",
  },
  {
    title: "Measure potential impact",
    body: "Compare before and after conditions to see how different interventions could reduce temperatures.",
    asset: "Illustration: hot block becoming a cool block",
    tint: "bg-orange-100 text-orange-600",
  },
];

const APPROACH: Card[] = [
  {
    title: "Temperature data",
    body: "Landsat satellite imagery (mid-morning surface) and 2019 Heat Watch air temperature (3 p.m.).",
    icon: Satellite,
    tint: "bg-sky-100 text-sky-700",
  },
  {
    title: "Urban data",
    body: "Building footprints and heights, mapped onto a hexagon grid of the city.",
    icon: Layers,
    tint: "bg-emerald-100 text-primary",
  },
  {
    title: "Intervention modeling",
    body: "Estimate the impact of green roofs, cool roofs, solar panels, and street trees, each with a cited source.",
    icon: ChartColumn,
    tint: "bg-sky-100 text-sky-700",
  },
];

function Eyebrow({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-[0.25em] text-slate-500 uppercase">
      {index && <span>{index} / </span>}
      {children}
    </p>
  );
}

function SectionHeading({ id, lead, accent }: { id: string; lead: string; accent: string }) {
  return (
    <h2
      id={id}
      className="mt-4 text-4xl leading-[1.05] font-bold tracking-tight text-slate-900 md:text-5xl"
    >
      {lead}
      <br />
      <span className="text-primary">{accent}</span>
    </h2>
  );
}

function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ title, body, icon: Icon, tint }) => (
        <li key={title} className="rounded-2xl bg-white/60 p-6 shadow-sm ring-1 ring-slate-900/5">
          <span className={`grid size-12 place-items-center rounded-full ${tint}`}>
            <Icon className="size-5" aria-hidden />
          </span>
          <h3 className="mt-6 font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
        </li>
      ))}
    </ul>
  );
}

const SECTION = "mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-20 md:px-12 lg:grid-cols-[5fr_7fr]";

export default function AboutPage() {
  return (
    <div className="bg-background">
      {/* Hero: copy on the left, skyline fading in from the right. */}
      <section aria-labelledby="about-heading" className="relative isolate overflow-hidden">
        <Image
          src={skylineImage}
          alt=""
          fill
          preload
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover object-[80%_center]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-transparent lg:via-background/60"
        />
        <SiteHeader current="about" />
        <div className="mx-auto w-full max-w-7xl px-6 pt-12 pb-24 md:px-12">
          <Eyebrow>About</Eyebrow>
          <h1
            id="about-heading"
            className="mt-4 max-w-2xl text-5xl leading-[1.02] font-bold tracking-tight text-slate-900 md:text-6xl"
          >
            A cooler, healthier,
            <br />
            <span className="text-primary">more resilient</span> Boston.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            CoolBoston is an interactive platform for exploring urban heat across Boston and testing
            how real-world interventions, like green roofs, cool roofs, and solar panels, can help
            create a cooler, healthier, and more resilient city.
          </p>
        </div>
      </section>

      <main aria-label="About CoolBoston">
        <section aria-labelledby="mission-heading" className={SECTION}>
          <div>
            <Eyebrow index="01">Our mission</Eyebrow>
            <SectionHeading id="mission-heading" lead="Turning insight" accent="into a cooler future." />
            <p className="mt-6 max-w-md leading-relaxed text-slate-600">
              We believe that a cooler Boston is a healthier, more equitable, and more resilient
              Boston. CoolBoston makes urban heat visible and gives people the tools to explore how
              greener, smarter buildings and neighborhoods can reduce temperatures and improve
              quality of life.
            </p>
          </div>
          <figure>
            <div className="flex justify-between gap-6 text-xs">
              <p>
                <span className="block font-semibold tracking-wider text-orange-700 uppercase">
                  Before
                </span>
                <span className="mt-1 block text-slate-600">
                  Higher surface temperatures and less vegetation
                </span>
              </p>
              <p className="text-right">
                <span className="block font-semibold tracking-wider text-primary uppercase">
                  After
                </span>
                <span className="mt-1 block text-slate-600">
                  Greener buildings and cooler surroundings
                </span>
              </p>
            </div>
            <AssetPlaceholder
              label="Before/after slider: hot city block vs. greened city block"
              className="mt-4 aspect-[16/10]"
            />
          </figure>
        </section>

        <section aria-labelledby="challenge-heading" className={SECTION}>
          <div>
            <Eyebrow index="02">The challenge</Eyebrow>
            <SectionHeading id="challenge-heading" lead="Why do cities" accent="get so hot?" />
            <p className="mt-6 max-w-md leading-relaxed text-slate-600">
              Urban heat islands form when buildings, roads, and other developed surfaces absorb and
              retain heat, while limited vegetation reduces natural cooling. This leads to higher
              temperatures, increased energy demand, and greater health risks, especially for
              vulnerable communities.
            </p>
          </div>
          <CardGrid cards={CHALLENGES} />
        </section>

        <section aria-labelledby="platform-heading" className={SECTION}>
          <div>
            <Eyebrow index="03">The platform</Eyebrow>
            <SectionHeading id="platform-heading" lead="Explore. Simulate." accent="Understand." />
            <p className="mt-6 max-w-md leading-relaxed text-slate-600">
              CoolBoston combines geospatial data, interactive visualization, and intervention
              modeling to help people explore how a greener city can make a real difference.
            </p>
          </div>
          <ol className="relative space-y-10">
            {/* Connector line behind the step numbers. */}
            <span aria-hidden className="absolute top-5 bottom-5 left-5 w-px bg-slate-200" />
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative grid items-center gap-6 sm:grid-cols-[1fr_14rem]">
                <div className="flex gap-5">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full font-semibold ${step.tint}`}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
                      {step.body}
                    </p>
                  </div>
                </div>
                <AssetPlaceholder label={step.asset} className="aspect-[4/3] max-sm:ml-15" />
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="approach-heading" className={SECTION}>
          <div>
            <Eyebrow index="04">Our approach</Eyebrow>
            <SectionHeading id="approach-heading" lead="Powered by data," accent="guided by impact." />
            <p className="mt-6 max-w-md leading-relaxed text-slate-600">
              We bring together satellite-derived surface temperatures, air temperature observations,
              and urban data to create a comprehensive view of heat across Boston. Our models
              estimate how interventions can reduce temperatures and improve the urban environment.
              Every figure is an estimate.
            </p>
          </div>
          <div>
            <CardGrid cards={APPROACH} />
            {/* The methodology lives in the map's Method tab for now. */}
            <Link
              href="/map"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/40 px-6 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Learn more about our methodology
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <section aria-labelledby="cta-heading" className="relative isolate overflow-hidden">
        <Image
          src={skylineImage}
          alt=""
          fill
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover object-[70%_70%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-background/90 via-background/60 to-transparent"
        />
        <div className="mx-auto w-full max-w-7xl px-6 py-28 md:px-12">
          <Eyebrow>A cooler Boston is possible</Eyebrow>
          <h2
            id="cta-heading"
            className="mt-4 text-4xl leading-[1.05] font-bold tracking-tight text-slate-900 md:text-5xl"
          >
            Explore the city.
            <br />
            <span className="text-primary">Rethink what’s possible.</span>
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-slate-700">
            Dive into the interactive map and see how a greener, cooler Boston can take shape.
          </p>
          <LaunchMapLink className="mt-8 px-8 py-4" />
        </div>
      </section>
    </div>
  );
}
