/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LocationBadge from "./location-badge.vue";
import type { UserLocation } from "../types";

const VIENNA: UserLocation = {
  latitude: 48.21,
  longitude: 16.37,
  name: "Vienna, Austria",
  source: "detected",
};

describe("LocationBadge", () => {
  it("emits 'detect' when the 'Use my current location' button is clicked", async () => {
    const wrapper = mount(LocationBadge, { props: { location: VIENNA } });

    const detectBtn = wrapper.get(
      'button[aria-label="Use my current location"]',
    );
    await detectBtn.trigger("click");

    expect(wrapper.emitted("detect")).toBeTruthy();
    expect(wrapper.emitted("detect")).toHaveLength(1);
  });

  it("emits 'change' when the Change button is clicked", async () => {
    const wrapper = mount(LocationBadge, { props: { location: VIENNA } });

    await wrapper.get("button.location-badge__action:last-of-type").trigger("click");

    expect(wrapper.emitted("change")).toBeTruthy();
  });

  it("disables the detect button and shows 'Detecting…' while in flight", () => {
    const wrapper = mount(LocationBadge, {
      props: { location: VIENNA, isDetecting: true },
    });

    const detectBtn = wrapper.get(
      'button[aria-label="Detecting your location"]',
    );
    expect(detectBtn.attributes("disabled")).toBeDefined();
    expect(detectBtn.text()).toContain("Detecting");
  });

  it("renders the detection error when provided", () => {
    const wrapper = mount(LocationBadge, {
      props: { location: VIENNA, detectionError: "User denied geolocation" },
    });

    expect(wrapper.text()).toContain("Couldn’t detect your location");
    expect(wrapper.text()).toContain("User denied geolocation");
  });

  it("does not render an error block when no detection error is set", () => {
    const wrapper = mount(LocationBadge, { props: { location: VIENNA } });
    expect(wrapper.find(".location-badge__error").exists()).toBe(false);
  });
});
