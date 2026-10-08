import test from "node:test";
import assert from "node:assert/strict";
import {safeStudyReturnPath} from "../src/lib/study/auth-return.ts";

test("deep study links including filters and course IDs survive authentication",()=>{
  assert.equal(safeStudyReturnPath("/courses/a?week=1&tab=notes"),"/courses/a?week=1&tab=notes");
  assert.equal(safeStudyReturnPath("/practice?mode=week&course=1"),"/practice?mode=week&course=1");
  assert.equal(safeStudyReturnPath("/semester/bootstrap"),"/semester/bootstrap");
});
test("absolute, protocol-relative, backslash and encoded separator redirects fail closed",()=>{
  for(const unsafe of ["https://evil.example","//evil.example","/\\evil.example",
    "/%5Cevil.example","/%2F%2Fevil.example","/foo/%5cbar", "javascript:alert(1)",
    "/a\nb","/login","/auth/google","/auth/callback?code=xyz"]) {
    assert.equal(safeStudyReturnPath(unsafe),"/",unsafe);
  }
});
test("oversized, missing or invalid return paths are rejected",()=>{
  assert.equal(safeStudyReturnPath(null),"/");
  assert.equal(safeStudyReturnPath(""),"/");
  assert.equal(safeStudyReturnPath("/"+"a".repeat(2500)),"/");
  assert.equal(safeStudyReturnPath("/safe#part"),"/safe#part");
});
