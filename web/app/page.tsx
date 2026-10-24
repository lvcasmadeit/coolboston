import { BottomPanel } from "@/components/BottomPanel";
import { RightPanel } from "@/components/RightPanel";
import { TopBar } from "@/components/TopBar";

export default function Home() {
  return (
    <div className="grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
      <TopBar />
      <div className="grid min-h-0 grid-cols-[1fr_320px] grid-rows-[1fr_220px]">
        <main aria-label="Map" className="relative min-h-0 bg-muted">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Map (Task 5)
          </div>
        </main>
        <div className="row-span-2 min-h-0 grid">
          <RightPanel />
        </div>
        <BottomPanel />
      </div>
    </div>
  );
}
