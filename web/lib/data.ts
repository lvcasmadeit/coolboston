import { HEXES_SCHEMA_VERSION, type Hex, type HexesFile } from "@/lib/types";

export class HexDataError extends Error {
  override name = "HexDataError";
}

const TOP_FIELDS = ["version", "hexes"] as const;
const HEX_FIELDS = ["id", "temp3pm", "surface"] as const satisfies readonly (keyof Hex)[];
const TEMP_FIELDS = ["temp3pm", "surface"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Every key present, no others. */
function checkKeys(obj: Record<string, unknown>, expected: readonly string[], where: string) {
  for (const k of expected) if (!(k in obj)) throw new HexDataError(`${where}: missing field "${k}"`);
  for (const k of Object.keys(obj))
    if (!expected.includes(k)) throw new HexDataError(`${where}: unexpected field "${k}"`);
}

function parseHex(v: unknown, i: number): Hex {
  const where = `hexes[${i}]`;
  if (!isRecord(v)) throw new HexDataError(`${where}: expected an object`);
  checkKeys(v, HEX_FIELDS, where);
  if (typeof v.id !== "string" || v.id === "") throw new HexDataError(`${where}.id: expected a non-empty string`);
  for (const f of TEMP_FIELDS) {
    const t = v[f];
    if (t !== null && (typeof t !== "number" || !Number.isFinite(t)))
      throw new HexDataError(`${where}.${f}: expected a finite number or null, got ${JSON.stringify(t)}`);
  }
  return v as unknown as Hex;
}

/** Validate an untrusted hexes.json document. Throws HexDataError naming the first bad field. */
export function parseHexes(input: unknown): HexesFile {
  if (!isRecord(input)) throw new HexDataError("hexes.json: expected a JSON object");
  checkKeys(input, TOP_FIELDS, "hexes.json");
  if (input.version !== HEXES_SCHEMA_VERSION)
    throw new HexDataError(`hexes.json: unsupported version ${JSON.stringify(input.version)}, expected ${HEXES_SCHEMA_VERSION}`);
  if (!Array.isArray(input.hexes)) throw new HexDataError("hexes.json: hexes must be an array");
  return { version: HEXES_SCHEMA_VERSION, hexes: input.hexes.map(parseHex) };
}
