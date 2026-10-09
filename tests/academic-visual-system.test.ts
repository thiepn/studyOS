import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css=readFileSync(new URL("../src/app/academic-system.css",import.meta.url),"utf8");
const primitives=readFileSync(new URL("../src/components/academic-ui.tsx",import.meta.url),"utf8");
const nav=readFileSync(new URL("../src/components/nav.tsx",import.meta.url),"utf8");
const layout=readFileSync(new URL("../src/app/layout.tsx",import.meta.url),"utf8");

test("semantic paper-and-ink tokens and legacy mappings stay present",()=>{
  for(const token of ["--academic-paper","--academic-sheet","--academic-ink","--academic-muted","--academic-rule","--academic-focus","--academic-font-display","--academic-content-width","--academic-control-height"])assert.ok(css.includes(token+":"),token);
  for(const token of ["--paper:var(--academic-paper)","--ink:var(--academic-ink)","--line:var(--academic-rule)","--surface:var(--academic-sheet)"])assert.ok(css.includes(token),token);
  assert.match(layout,/import "\.\/academic-system\.css"/);
});
test("core navigation and page semantics remain accessible and differentiated",()=>{
  assert.match(nav,/aria-label="Primary navigation"/);
  assert.match(nav,/aria-current=/);
  assert.match(primitives,/<h1>\{title\}<\/h1>/);
  assert.match(primitives,/<h2 id=\{id\}>\{title\}<\/h2>/);
  assert.match(css,/\.academic-nav \.nav-primary > a\[aria-current="page"\]/);
});
test("keyboard, mobile, reduced-motion and high-contrast affordances are explicitly specified",()=>{
  assert.match(css,/:focus-visible/);
  assert.match(css,/outline:3px solid var\(--academic-focus\)/);
  assert.match(css,/--academic-control-height:44px/);
  assert.match(css,/@media \(max-width:650px\)/);
  assert.match(css,/min-height:48px/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/@media \(forced-colors:active\)/);
});
test("visual layer contains no decorative gradients or heavyweight display effects",()=>{
  assert.doesNotMatch(css,/(?:linear|radial|conic)-gradient\s*\(/);
  assert.doesNotMatch(css,/backdrop-filter\s*:/);
  assert.doesNotMatch(css,/border-radius\s*:\s*(?:9999|999)px/);
});
