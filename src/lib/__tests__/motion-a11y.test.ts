import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("reduced-motion + motion language", () => {
  it("globals.css disables named motion under prefers-reduced-motion", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
    for (const name of [
      "cos-hero-in",
      "cos-hero-in-stagger",
      "cos-match-enter",
      "cos-filter-fade",
      "cos-score-tick",
      "cos-live-dot",
    ]) {
      assert.match(css, new RegExp(`${name}[\\s\\S]*animation:\\s*none`));
    }
  });

  it("does not use perpetual live pulse as the only motion language", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    assert.match(css, /cos-hero-in-stagger/);
    assert.match(css, /cos-match-enter/);
    assert.match(css, /LIVE pulse only when a real LIVE/);
  });
});
