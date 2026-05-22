/**
 * Protected Paths Extension
 *
 * Blocks write/edit to sensitive files without confirmation.
 * Adapted for running-forecast project.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	const protectedPaths = [".env", ".git/", "node_modules/", "package-lock.json"];

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "write" && event.toolName !== "edit") {
			return undefined;
		}

		const path = event.input.path as string;
		const isProtected = protectedPaths.some((p) => path.includes(p));

		if (isProtected) {
			if (ctx.hasUI) {
				const ok = await ctx.ui.confirm(
					"Protected path",
					`Allow write to ${path}?`,
				);
				if (!ok) {
					return { block: true, reason: `Write to "${path}" blocked by user` };
				}
				return undefined;
			}
			return { block: true, reason: `Path "${path}" is protected` };
		}

		return undefined;
	});
}
