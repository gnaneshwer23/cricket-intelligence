import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("visual redesign tokens", () => {
  it("defines soft canvas, navy, action orange, and pitch green", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    assert.match(css, /--cos-canvas:\s*#fbfaf7/i);
    assert.match(css, /--cos-navy:\s*#03314c/i);
    assert.match(css, /--cos-action:\s*#e85d04/i);
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

  it("home hero keeps brand promise and Ask Cricket Intelligence CTA", () => {
    const home = readFileSync(join(root, "src/components/screens/home.tsx"), "utf8");
    assert.match(home, /Every match has a story\. Find the evidence\./);
    assert.match(home, /Explore cricket history, understand match situations/);
    assert.match(home, /Ask Cricket Intelligence/);
    assert.match(home, /EmptyState/);
  });

  it("layout defaults to light canvas \(no forced dark class\)", () => {
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
    assert.doesNotMatch(layout, /\bdark\b/);
  });
});
