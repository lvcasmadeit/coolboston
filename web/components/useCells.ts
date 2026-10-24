"use client";

import { useEffect, useState } from "react";
import { CELLS_URL, parseCells } from "@/lib/data";
import type { Cell } from "@/lib/types";

export type CellsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; cells: Cell[] };

// One fetch shared by every component that needs the cells (map, Act panel). A failed fetch is
// forgotten so the next mount retries.
let shared: Promise<Cell[]> | null = null;

function loadCells(): Promise<Cell[]> {
  shared ??= fetch(CELLS_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`GET ${CELLS_URL} failed: ${r.status}`);
      return r.json();
    })
    .then((json) => parseCells(json).cells)
    .catch((e: unknown) => {
      shared = null;
      throw e;
    });
  return shared;
}

/** Fetch and validate the tile data (once per page), then return it. */
export function useCells(): CellsState {
  const [state, setState] = useState<CellsState>({ status: "loading" });

  useEffect(() => {
    let live = true;
    loadCells().then(
      (cells) => live && setState({ status: "ready", cells }),
      (e: unknown) => live && setState({ status: "error", message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, []);

  return state;
}
