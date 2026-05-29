/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ViewModeToggle from "./view-mode-toggle.vue";

describe("ViewModeToggle", () => {
  it("renders a Timeline and Week tab", () => {
    const wrapper = mount(ViewModeToggle, { props: { viewMode: "timeline" } });
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs.map((t) => t.text())).toEqual(["Timeline", "Week"]);
  });

  it("marks the active tab with aria-selected and tabindex 0", () => {
    const wrapper = mount(ViewModeToggle, { props: { viewMode: "week" } });
    const active = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.attributes("aria-selected") === "true");
    expect(active!.text()).toBe("Week");
    expect(active!.attributes("tabindex")).toBe("0");
  });

  it("emits select when a different tab is clicked", async () => {
    const wrapper = mount(ViewModeToggle, { props: { viewMode: "timeline" } });
    await wrapper.findAll('[role="tab"]')[1].trigger("click");
    expect(wrapper.emitted("select")).toEqual([["week"]]);
  });

  it("does not emit when the active tab is clicked again", async () => {
    const wrapper = mount(ViewModeToggle, { props: { viewMode: "timeline" } });
    await wrapper.findAll('[role="tab"]')[0].trigger("click");
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("moves selection with arrow keys", async () => {
    const wrapper = mount(ViewModeToggle, { props: { viewMode: "timeline" } });
    await wrapper.findAll('[role="tab"]')[0].trigger("keydown", {
      key: "ArrowRight",
    });
    expect(wrapper.emitted("select")).toEqual([["week"]]);
  });
});
