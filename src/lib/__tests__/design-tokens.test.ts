import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("visual redesign tokens", () => {
  it("defines the periwinkle canvas, navy ink, cobalt accent and glass surfaces", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    assert.match(css, /--cos-canvas:\s*#eef2fd/i);
    assert.match(css, /--cos-navy:\s*#0b1b3f/i);
    assert.match(css, /--cos-blue:\s*#3554f0/i);
    assert.match(css, /\.glass \{/);
    assert.doesNotMatch(css, /#e85d04/i, "orange retired");
    assert.match(css, /--cos-pitch:/i);
    assert.match(css, /--color-action:\s*var\(--cos-action\)/);
  });

  it("keeps the shell light: frosted rail, navy type, no navy sidebar fill", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
    assert.match(rootBlock, /--sidebar:\s*color-mix\(in oklab, white/);
    assert.match(rootBlock, /--sidebar-foreground:\s*var\(--cos-navy\)/);
    const shell = readFileSync(join(root, "src/components/cricket-os.tsx"), "utf8");
    assert.doesNotMatch(shell, /leading-none text-white/);
  });

  it("keeps reduced-motion guards on named animations", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
    assert.match(css, /cos-hero-in[\s\S]*animation:\s*none/);
  });

  it("home hero carries the brand and routes questions to the assistant, with no DEMO copy", () => {
    const home = readFileSync(join(root, "src/components/screens/home.tsx"), "utf8");
    assert.match(home, /Intelligence/);
    assert.match(home, /openAssistant/);
    assert.doesNotMatch(home, /DEMO|Copilot|[Tt]ruth mode/);
    const feed = readFileSync(join(root, "src/components/screens/feed.tsx"), "utf8");
    assert.doesNotMatch(feed, /Root 61%|Predictions for you/, "no hardcoded predictions");
  });

  it("layout defaults to light canvas \(no forced dark class\)", () => {
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
    assert.doesNotMatch(layout, /\bdark\b/);
  });
});
