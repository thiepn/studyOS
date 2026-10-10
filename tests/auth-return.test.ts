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

test("return-to-work rejects internal endpoints and encoded internal-path aliases",()=>{
  for(const path of [
    "/api/study/resources/register", "/api", "/login?next=/courses",
    "/auth/callback", "/_next/static/chunk.js", "/.well-known/openid-configuration",
    "/%61pi/study/commitments", "/%2561pi/study/commitments",
    "/%5fnext/assets", "/courses/%2e%2e/api/private", "/%252f%252fevil.example",
    "/foo/%", "//evil.example", "/\\\\evil.example",
  ])assert.equal(safeStudyReturnPath(path),"/",path);
});
test("authorized UI return candidates retain course context, filters, unicode and archive deep links",()=>{
  for(const path of [
    "/courses/550e8400-e29b-41d4-a716-446655440000#course-settings",
    "/semester/archive/550e8400-e29b-41d4-a716-446655440001",
    "/semester/bootstrap#semester-roster",
    "/resources?course=abc&week=3#source-library",
    "/practice?mode=exam&course=ABC",
  ])assert.equal(safeStudyReturnPath(path),path);
});
