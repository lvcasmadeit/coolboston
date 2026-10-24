import { BottomPanel } from "@/components/BottomPanel";
import { MapClient } from "@/components/MapClient";
import { RightPanel } from "@/components/RightPanel";
import { TopBar } from "@/components/TopBar";

export default function MapPage() {
  return (
    <div className="grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
      <TopBar />
      <div className="grid min-h-0 grid-cols-[1fr_320px] grid-rows-[1fr_220px]">
        <main aria-label="Map" className="relative min-h-0 bg-muted">
          <MapClient />
        </main>
        <div className="row-span-2 min-h-0 grid">
          <RightPanel />
        </div>
        <BottomPanel />
      </div>
    </div>
  );
}
