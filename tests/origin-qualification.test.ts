import test from "node:test";
import assert from "node:assert/strict";
import {isQualifiedAppOrigin} from "../src/lib/study/origin-qualification.ts";
test("production and preview require clean externally reachable HTTPS origins",()=>{
  assert.equal(isQualifiedAppOrigin("https://study.thiepn.dev","production"),true);
  assert.equal(isQualifiedAppOrigin("http://localhost:3000","production"),false);
  assert.equal(isQualifiedAppOrigin("http://127.0.0.1:3000","preview"),false);
  assert.equal(isQualifiedAppOrigin("https://localhost:3000","production"),false);
  assert.equal(isQualifiedAppOrigin("https://example.com/evil","production"),false);
  assert.equal(isQualifiedAppOrigin("https://example.com?token=secret","production"),false);
  assert.equal(isQualifiedAppOrigin("invalid","production"),false);
});
test("development supports genuine loopback and secure external origins",()=>{
  assert.equal(isQualifiedAppOrigin("http://localhost:3000","development"),true);
  assert.equal(isQualifiedAppOrigin("http://127.0.0.1:3000","development"),true);
  assert.equal(isQualifiedAppOrigin("http://evil.example","development"),false);
  assert.equal(isQualifiedAppOrigin("https://preview.example","development"),true);
});
