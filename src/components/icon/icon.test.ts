/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Icon from "./icon.vue";
import { ICONS } from "./icons";

describe("Icon", () => {
  it("renders the requested icon's path data", () => {
    const wrapper = mount(Icon, { props: { name: "thermometer" } });
    // The browser normalizes self-closing tags to <path …></path>, so compare
    // by `d` attributes rather than raw markup.
    const ds = wrapper.findAll("path").map((p) => p.attributes("d"));
    expect(ds).toEqual([
      "M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z",
      "M12 9v6",
    ]);
  });

  it("defaults to 16×16 and uses currentColor for stroke", () => {
    const wrapper = mount(Icon, { props: { name: "wind" } });
    const svg = wrapper.find("svg");
    expect(svg.attributes("width")).toBe("16");
    expect(svg.attributes("height")).toBe("16");
    expect(svg.attributes("stroke")).toBe("currentColor");
    expect(svg.attributes("fill")).toBe("none");
  });

  it("honors a custom size", () => {
    const wrapper = mount(Icon, { props: { name: "wind", size: 24 } });
    const svg = wrapper.find("svg");
    expect(svg.attributes("width")).toBe("24");
    expect(svg.attributes("height")).toBe("24");
  });

  it("is aria-hidden by default (decorative)", () => {
    const wrapper = mount(Icon, { props: { name: "moon" } });
    const svg = wrapper.find("svg");
    expect(svg.attributes("aria-hidden")).toBe("true");
    expect(svg.attributes("aria-label")).toBeUndefined();
    expect(svg.attributes("role")).toBeUndefined();
  });

  it("exposes an accessible label when one is provided", () => {
    const wrapper = mount(Icon, {
      props: { name: "alert", label: "Warning" },
    });
    const svg = wrapper.find("svg");
    expect(svg.attributes("role")).toBe("img");
    expect(svg.attributes("aria-label")).toBe("Warning");
    expect(svg.attributes("aria-hidden")).toBeUndefined();
  });

  it("renders every declared icon without throwing", () => {
    for (const name of Object.keys(ICONS) as Array<keyof typeof ICONS>) {
      const wrapper = mount(Icon, { props: { name } });
      expect(wrapper.find("svg").exists()).toBe(true);
    }
  });
});
