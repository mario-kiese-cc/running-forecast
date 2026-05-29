/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProfilePanel from "./profile-panel.vue";
import { DEFAULT_PROFILE, BUILT_IN_PROFILES } from "../services/scoring-profile-presets";

describe("ProfilePanel", () => {
  it("should render the active profile label in the header", () => {
    const wrapper = mount(ProfilePanel, {
      props: { profile: DEFAULT_PROFILE },
      attachTo: document.body,
    });
    expect(wrapper.text()).toContain("Active: Default");
    wrapper.unmount();
  });

  it("should emit 'close' when the close button is clicked", async () => {
    const wrapper = mount(ProfilePanel, {
      props: { profile: DEFAULT_PROFILE },
      attachTo: document.body,
    });

    await wrapper
      .get('button[aria-label="Close scoring profile settings"]')
      .trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("should emit 'close' when Escape is pressed", async () => {
    const wrapper = mount(ProfilePanel, {
      props: { profile: DEFAULT_PROFILE },
      attachTo: document.body,
    });

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(event);

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("should emit 'select-preset' when a preset button is clicked", async () => {
    const wrapper = mount(ProfilePanel, {
      props: { profile: DEFAULT_PROFILE },
      attachTo: document.body,
    });

    // The Heat-sensitive preset button.
    const buttons = wrapper.findAll("button");
    const heatBtn = buttons.find((b) => b.text().includes("Heat-sensitive"));
    expect(heatBtn).toBeDefined();
    await heatBtn!.trigger("click");

    const selectEvents = wrapper.emitted("select-preset");
    expect(selectEvents).toBeTruthy();
    expect(selectEvents![0]).toEqual(["heat-sensitive"]);
    wrapper.unmount();
  });

  it("should mark the basedOn preset as active for a custom profile", () => {
    const wrapper = mount(ProfilePanel, {
      props: {
        profile: {
          ...BUILT_IN_PROFILES["winter-runner"],
          preset: "custom",
          basedOn: "winter-runner",
        },
      },
      attachTo: document.body,
    });

    const buttons = wrapper.findAll("button");
    const winterBtn = buttons.find((b) =>
      b.text().includes("Winter runner"),
    );
    expect(winterBtn!.classes()).toContain(
      "profile-preset-list__item--active",
    );
    wrapper.unmount();
  });

  it("should emit 'reset' when 'Reset to defaults' is clicked", async () => {
    const wrapper = mount(ProfilePanel, {
      props: { profile: DEFAULT_PROFILE },
      attachTo: document.body,
    });

    const buttons = wrapper.findAll("button");
    const resetBtn = buttons.find((b) => b.text() === "Reset to defaults");
    expect(resetBtn).toBeDefined();
    await resetBtn!.trigger("click");

    expect(wrapper.emitted("reset")).toBeTruthy();
    wrapper.unmount();
  });

  it("should emit 'update-darkness' when the darkness slider changes", async () => {
    const wrapper = mount(ProfilePanel, {
      props: { profile: DEFAULT_PROFILE },
      attachTo: document.body,
    });

    const ranges = wrapper.findAll('input[type="range"]');
    // Slider order: 6 weight sliders, 2 range handles (low/high), then darkness.
    const darknessSlider = ranges[ranges.length - 1];
    await darknessSlider.setValue(80);

    const events = wrapper.emitted("update-darkness");
    expect(events).toBeTruthy();
    expect(events![0]).toEqual([80]);
    wrapper.unmount();
  });
});
