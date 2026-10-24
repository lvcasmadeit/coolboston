"use client";

import dynamic from "next/dynamic";
import { checkMapboxToken } from "@/lib/mapConfig";

// mapbox-gl touches `window`, so the map is client-only. `ssr: false` must live in a Client Component.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <MapMessage>Loading map…</MapMessage>,
});

function MapMessage({ children, role }: { children: React.ReactNode; role?: "alert" }) {
  return (
    <div role={role} className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <p className="max-w-md">{children}</p>
    </div>
  );
}

export function MapClient() {
  const check = checkMapboxToken(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  if (!check.ok) return <MapMessage role="alert">{check.reason}</MapMessage>;
  return <MapView token={check.token} />;
}
