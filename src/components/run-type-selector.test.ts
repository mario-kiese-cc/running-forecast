/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RunTypeSelector from "./run-type-selector.vue";
import { RUN_TYPE_MODIFIERS, RUN_TYPE_ORDER } from "../services/run-type";

describe("RunTypeSelector", () => {
  it("renders one button per run type, in the configured order", () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "easy" },
    });
    const buttons = wrapper.findAll('[role="radio"]');
    expect(buttons).toHaveLength(RUN_TYPE_ORDER.length);
    const labels = buttons.map((b) => b.text());
    expect(labels).toEqual(
      RUN_TYPE_ORDER.map((rt) => RUN_TYPE_MODIFIERS[rt].label),
    );
  });

  it("marks the active option as aria-checked and tabindex 0", () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "intervals" },
    });
    const active = wrapper
      .findAll('[role="radio"]')
      .find((b) => b.attributes("aria-checked") === "true");
    expect(active).toBeTruthy();
    expect(active!.text()).toContain("Intervals");
    expect(active!.attributes("tabindex")).toBe("0");

    // All other options are tabindex -1.
    const inactiveTabIndices = wrapper
      .findAll('[role="radio"]')
      .filter((b) => b.attributes("aria-checked") !== "true")
      .map((b) => b.attributes("tabindex"));
    expect(inactiveTabIndices.every((t) => t === "-1")).toBe(true);
  });

  it("renders one icon per option", () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "easy" },
    });
    const icons = wrapper.findAll('[role="radio"] svg');
    expect(icons).toHaveLength(RUN_TYPE_ORDER.length);
  });

  it("emits 'select' with the clicked run type", () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "easy" },
    });
    const longButton = wrapper
      .findAll('[role="radio"]')
      .find((b) => b.text().includes("Long"));
    longButton!.trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["long"]);
  });

  it("does not emit when clicking the already-active option", () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "tempo" },
    });
    const tempoButton = wrapper
      .findAll('[role="radio"]')
      .find((b) => b.text().includes("Tempo"));
    tempoButton!.trigger("click");
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("ArrowRight moves selection to the next run type", async () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "easy" },
    });
    const easyButton = wrapper.findAll('[role="radio"]')[0];
    await easyButton.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("select")?.[0]).toEqual(["long"]);
  });

  it("ArrowLeft wraps from the first option to the last", async () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "easy" },
    });
    const easyButton = wrapper.findAll('[role="radio"]')[0];
    await easyButton.trigger("keydown", { key: "ArrowLeft" });
    expect(wrapper.emitted("select")?.[0]).toEqual(["recovery"]);
  });

  it("Home jumps to the first option and End to the last", async () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "intervals" },
    });
    const intervalsButton = wrapper
      .findAll('[role="radio"]')
      .find((b) => b.attributes("aria-checked") === "true");
    await intervalsButton!.trigger("keydown", { key: "Home" });
    expect(wrapper.emitted("select")?.[0]).toEqual(["easy"]);

    await intervalsButton!.trigger("keydown", { key: "End" });
    expect(wrapper.emitted("select")?.[1]).toEqual(["recovery"]);
  });

  it("renders the description of the active run type as the caption", () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "intervals" },
    });
    expect(wrapper.text()).toContain(
      RUN_TYPE_MODIFIERS.intervals.description,
    );
  });

  it("updates the caption when the runType prop changes", async () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "easy" },
    });
    expect(wrapper.text()).toContain(RUN_TYPE_MODIFIERS.easy.description);
    await wrapper.setProps({ runType: "recovery" });
    expect(wrapper.text()).toContain(
      RUN_TYPE_MODIFIERS.recovery.description,
    );
  });

  it("uses role=radiogroup with an accessible label", () => {
    const wrapper = mount(RunTypeSelector, {
      props: { runType: "easy" },
    });
    const group = wrapper.find('[role="radiogroup"]');
    expect(group.exists()).toBe(true);
    expect(group.attributes("aria-label")).toBe("Run type");
  });
});
