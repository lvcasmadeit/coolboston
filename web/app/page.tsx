import { InterventionsPanel } from "@/components/InterventionsPanel";
import { MapClient } from "@/components/MapClient";
import { RightPanel } from "@/components/RightPanel";
import { TopBar } from "@/components/TopBar";

export default function Home() {
  return (
    <div className="grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
      <TopBar />
      <div className="grid min-h-0 grid-cols-[300px_1fr_360px]">
        <InterventionsPanel />
        <main aria-label="Map" className="relative min-h-0 bg-muted">
          <MapClient />
        </main>
        <RightPanel />
      </div>
    </div>
  );
}
