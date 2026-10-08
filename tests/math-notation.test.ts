import test from "node:test";
import assert from "node:assert/strict";
import { parseMathExpression,splitMathContent } from "../src/lib/study/math-notation.ts";

test("fractions, indexed roots and scripts form native MathML structures",()=>{
  const parsed=parseMathExpression("\\frac{x^2 + 1}{\\sqrt[3]{y_0}}");
  assert.equal(parsed?.kind,"frac");
  if(parsed?.kind!=="frac")return;
  assert.equal(parsed.numerator.kind,"row");
  assert.equal(parsed.denominator.kind,"sqrt");
  if(parsed.denominator.kind==="sqrt")assert.equal(parsed.denominator.index?.kind,"mn");
});

test("binomial notation must not be confused with fraction notation",()=>{
  const parsed=parseMathExpression("\\binom{n}{k}");
  assert.equal(parsed?.kind,"frac");
  if(parsed?.kind==="frac")assert.equal(parsed.binomial,true);
});

test("math identifiers, Greek symbols, limits and sets are recognized",()=>{
  const expression="\\lim_{n\\to\\infty}\\sum_{k=1}^{n}\\frac{1}{k^2}\\in\\mathbb{R}";
  const parsed=parseMathExpression(expression);
  assert.equal(parsed?.kind,"row");
  if(parsed?.kind==="row")assert.ok(parsed.children.some(node=>node.kind==="frac"));
});

test("matrices and aligned derivations group by rows and columns",()=>{
  const matrix=parseMathExpression("\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}");
  assert.equal(matrix?.kind,"table");
  if(matrix?.kind==="table"){
    assert.equal(matrix.opening,"(");
    assert.equal(matrix.rows.length,2);
    assert.equal(matrix.rows[0].length,2);
  }
  const aligned=parseMathExpression("\\begin{aligned} y' &= -2y \\\\ y(t) &= Ce^{-2t} \\end{aligned}");
  assert.equal(aligned?.kind,"table");
});

test("mixed lecture text only typesets explicit math delimiters",()=>{
  const src="For \\(x \\in \\mathbb{R}\\), compute \\[\\frac{1}{2}\\]. Price is $20.";
  const parts=splitMathContent(src);
  assert.deepEqual(parts.map(part=>part.kind),["text","math","text","math","text"]);
  assert.equal(parts[1].kind,"math");
  if(parts[1].kind==="math")assert.equal(parts[1].display,false);
  if(parts[3].kind==="math")assert.equal(parts[3].display,true);
  assert.equal(parts[4].kind,"text");
  if(parts[4].kind==="text")assert.ok(parts[4].value.includes("$20"));
});

test("unsupported content stays literal rather than injected as markup",()=>{
  const parts=splitMathContent("Statement \\(\\htmlClass{danger}{x}\\) remains source.");
  const formula=parts.find(part=>part.kind==="math");
  assert.ok(formula);
  if(formula?.kind==="math")assert.equal(formula.parsed,null);
  assert.equal(parseMathExpression("\\frac{x}{y"),null);
  assert.equal(parseMathExpression("x^"),null);
  assert.equal(parseMathExpression("x_1_2"),null);
  assert.equal(parseMathExpression("\\text{<img src=x>}")?.kind,"mtext");
  assert.equal(parseMathExpression("x".repeat(3500)),null);
});

test("unclosed math delimiters stay visible plain text",()=>{
  const parts=splitMathContent("Proof: \\(\\frac{x}{y}");
  assert.deepEqual(parts.map(p=>p.kind),["text","text"]);
});
