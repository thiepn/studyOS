import test from "node:test";
import assert from "node:assert/strict";
import { outlineProof } from "../src/lib/study/proof-outline.ts";

test("proof outline extracts reproducible positions from structured working",()=>{
  const text="Proof:\nAssume x>0.\nStep 1: establish the bound\nThen algebra\nCase 2: x=0\nConclusion: P holds.";
  const anchors=outlineProof(text);
  assert.deepEqual(anchors.map(a=>a.line),[1,2,3,5,6]);
  assert.equal(text.slice(anchors[3].offset).startsWith("Case 2"),true);
});
test("non-structured math text does not fabricate headings",()=>{
  assert.deepEqual(outlineProof("Take arbitrary n.\nThen f'(x)=x^2."),[]);
});
