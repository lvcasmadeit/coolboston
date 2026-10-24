import { describe, expect, it } from "vitest";
import { formatTemp, valueRange } from "@/lib/heat";

describe("valueRange", () => {
  it("returns min and max, ignoring nulls", () => {
    expect(valueRange([91.2, null, 88.4, 94.1, null])).toEqual({ min: 88.4, max: 94.1 });
  });

  it("is null when there are no values", () => {
    expect(valueRange([])).toBeNull();
    expect(valueRange([null, null])).toBeNull();
  });
});

describe("formatTemp", () => {
  it("rounds to one decimal with a °F unit", () => {
    expect(formatTemp(91.26)).toBe("91.3 °F");
    expect(formatTemp(88)).toBe("88.0 °F");
  });

  it("says when there is no data", () => {
    expect(formatTemp(null)).toBe("No data");
  });
});
