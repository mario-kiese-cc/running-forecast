/**
 * Status Line Extension
 *
 * Shows turn count and git branch in the footer for quick context.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	let turnCount = 0;

	async function updateBranch(ctx: { ui: { theme: any; setStatus: (id: string, text: string) => void } }): Promise<void> {
		const { stdout } = await pi.exec("git", ["branch", "--show-current"]);
		const branch = stdout.trim();
		const theme = ctx.ui.theme;
		if (branch) {
			ctx.ui.setStatus("git-branch", theme.fg("dim", `⎇ ${branch}`));
		}
	}

	pi.on("session_start", async (_event, ctx) => {
		turnCount = 0;
		const theme = ctx.ui.theme;
		ctx.ui.setStatus("turn-count", theme.fg("dim", "Ready"));
		await updateBranch(ctx);
	});

	pi.on("turn_start", async (_event, ctx) => {
		turnCount++;
		const theme = ctx.ui.theme;
		ctx.ui.setStatus("turn-count", theme.fg("accent", "●") + theme.fg("dim", ` Turn ${turnCount}...`));
	});

	pi.on("turn_end", async (_event, ctx) => {
		const theme = ctx.ui.theme;
		ctx.ui.setStatus("turn-count", theme.fg("success", "✓") + theme.fg("dim", ` Turn ${turnCount}`));
		await updateBranch(ctx);
	});
}
