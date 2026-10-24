"use client";

import { useEffect, useState } from "react";
import { HEXES_URL, parseHexes } from "@/lib/data";
import type { Hex } from "@/lib/types";

export type HexesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; hexes: Hex[] };

// One fetch shared by every component that needs the hexes (map, Act panel). A failed fetch is
// forgotten so the next mount retries.
let shared: Promise<Hex[]> | null = null;

function loadHexes(): Promise<Hex[]> {
  shared ??= fetch(HEXES_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`GET ${HEXES_URL} failed: ${r.status}`);
      return r.json();
    })
    .then((json) => parseHexes(json).hexes)
    .catch((e: unknown) => {
      shared = null;
      throw e;
    });
  return shared;
}

/** Fetch and validate the hex data (once per page), then return it. */
export function useHexes(): HexesState {
  const [state, setState] = useState<HexesState>({ status: "loading" });

  useEffect(() => {
    let live = true;
    loadHexes().then(
      (hexes) => live && setState({ status: "ready", hexes }),
      (e: unknown) => live && setState({ status: "error", message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, []);

  return state;
}
