import { describe, expect, it } from "vitest";
import { formatAcres, formatArea, formatDeltaF, formatEstimate, formatNumRange, formatUsdRange } from "@/lib/format";

describe("format", () => {
  it("compacts dollar ranges", () => {
    expect(formatUsdRange({ low: 950, central: 2000, high: 12_345 })).toBe("$950–$12k");
    expect(formatUsdRange({ low: 1_500, central: 2e6, high: 2_500_000 })).toBe("$1.5k–$2.5M");
  });

  it("formats number ranges with a unit", () => {
    expect(formatNumRange({ low: 1234, central: 2000, high: 56_789 }, "kWh/yr")).toBe("1,234–57k kWh/yr");
  });

  it("passes not-quantified through as text", () => {
    expect(formatEstimate({ kind: "not-quantified", reason: "x" }, formatUsdRange)).toBe("not quantified");
  });

  it("formats areas in m², ft² and acres", () => {
    expect(formatArea(1000)).toBe("1,000 m² (10,764 ft²)");
    expect(formatAcres(15_047)).toBe("3.7 acres");
  });

  it("signs temperature changes with a true minus and drops negative zero", () => {
    expect(formatDeltaF(-0.4234)).toBe("−0.42 °F");
    expect(formatDeltaF(0.1)).toBe("+0.10 °F");
    expect(formatDeltaF(-0.001)).toBe("0.00 °F");
  });
});
