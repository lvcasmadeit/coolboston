"use client";

import { useEffect, useState } from "react";
import { parseHexes } from "@/lib/data";
import type { Hex } from "@/lib/types";

export type HexesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; hexes: Hex[] };

/** Fetch and validate /api/hexes once per mount. */
export function useHexes(): HexesState {
  const [state, setState] = useState<HexesState>({ status: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/hexes", { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/hexes failed: ${r.status}`);
        return r.json();
      })
      .then((json) => setState({ status: "ready", hexes: parseHexes(json).hexes }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ status: "error", message: e instanceof Error ? e.message : String(e) });
      });
    return () => ctrl.abort();
  }, []);

  return state;
}
