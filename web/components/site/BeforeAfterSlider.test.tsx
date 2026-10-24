import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

const img = (src: string) => ({ src, width: 1536, height: 1024, blurDataURL: "data:image/png;base64,AA==" });

function renderSlider(initial?: number) {
  render(
    <BeforeAfterSlider
      label="Compare blocks"
      before={{ src: img("/hot.png"), alt: "Hot block" }}
      after={{ src: img("/green.png"), alt: "Green block" }}
      initial={initial}
    />,
  );
  return {
    slider: screen.getByRole("slider", { name: "Compare blocks" }),
    before: screen.getByAltText("Hot block"),
  };
}

describe("BeforeAfterSlider", () => {
  afterEach(cleanup);

  it("starts at the midpoint and clips the before image to it", () => {
    const { slider, before } = renderSlider();
    expect(slider).toHaveProperty("value", "50");
    expect(before.style.clipPath).toBe("inset(0 50% 0 0)");
    expect(screen.getByAltText("Green block")).toBeTruthy();
  });

  it("moves the clip and announces the split when the slider changes", () => {
    const { slider, before } = renderSlider(30);
    fireEvent.change(slider, { target: { value: "80" } });
    expect(before.style.clipPath).toBe("inset(0 20% 0 0)");
    expect(slider.getAttribute("aria-valuetext")).toBe("80% before, 20% after");
  });
});
