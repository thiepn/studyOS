import test from "node:test";
import assert from "node:assert/strict";
import { isMorePath, MORE_SECTIONS } from "../src/lib/study/more-navigation.ts";

test("More is a dedicated page with grouped operational routes",()=>{
  assert.equal(isMorePath("/more"),true);
  for(const section of MORE_SECTIONS){
    assert.ok(section.entries.length>0);
    for(const entry of section.entries){
      assert.equal(isMorePath(entry.href),true);
      assert.equal(entry.href.startsWith("/"),true);
    }
  }
});
test("deep operational paths inherit More and main tabs stay separate",()=>{
  assert.equal(isMorePath("/semester/archive/example"),true);
  for(const route of ["/strategy","/outlook","/quality"])assert.equal(isMorePath(route),true);
  for(const route of ["/","/practice","/practice/exam/123","/courses","/courses/123","/progress","/weekly"]){
    assert.equal(isMorePath(route),false,route);
  }
});
