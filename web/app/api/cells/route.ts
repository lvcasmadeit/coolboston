import raw from "@/data/cells.json";
import { parseCells } from "@/lib/data";

// Static import: the file is validated and the response prerendered at build time, so a
// malformed cells.json fails `next build` instead of a user's request.
const body = JSON.stringify(parseCells(raw));

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      // Data only changes when the pipeline re-runs and the app is redeployed.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
