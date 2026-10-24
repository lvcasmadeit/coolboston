"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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

/**
 * True only while this component's effects are connected. Next keeps a left route alive but hidden
 * (React Activity): effects clean up on hide and reconnect on return without a remount. react-map-gl
 * removes its map on cleanup and would reconnect to the dead instance, so unmount the map while
 * hidden and mount a fresh one on return.
 */
function useConnected() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tracking effect (dis)connection is the point
    setConnected(true);
    return () => setConnected(false);
  }, []);
  return connected;
}

export function MapClient() {
  const connected = useConnected();
  const check = checkMapboxToken(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  if (!check.ok) return <MapMessage role="alert">{check.reason}</MapMessage>;
  if (!connected) return <MapMessage>Loading map…</MapMessage>;
  return <MapView token={check.token} />;
}
