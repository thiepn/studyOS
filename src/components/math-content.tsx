import { createElement, type ReactNode } from "react";
import { parseMathExpression, splitMathContent, type MathNode } from "@/lib/study/math-notation";

/** MathML elements are constructed explicitly because the project's current
 * React JSX typings do not expose MathML tags as intrinsic JSX elements.
 * The browser still receives proper namespaced native MathML through React. */
function render(node:MathNode):ReactNode{
  switch(node.kind){
    case "mi":
    case "mn":
    case "mo":
    case "mtext":
      return createElement(node.kind,null,node.value);
    case "row":
      return createElement("mrow",null,...node.children.map(render));
    case "frac":
      return node.binomial
        ? createElement("mrow",null,
          createElement("mo",null,"("),
          createElement("mfrac",{linethickness:"0"},render(node.numerator),render(node.denominator)),
          createElement("mo",null,")"))
        : createElement("mfrac",null,render(node.numerator),render(node.denominator));
    case "sqrt":
      return node.index
        ? createElement("mroot",null,render(node.radicand),render(node.index))
        : createElement("msqrt",null,render(node.radicand));
    case "script":
      return node.sub&&node.sup
        ? createElement("msubsup",null,render(node.base),render(node.sub),render(node.sup))
        : node.sub
          ? createElement("msub",null,render(node.base),render(node.sub))
          : createElement("msup",null,render(node.base),render(node.sup!));
    case "table":
      return createElement("mrow",null,
        node.opening?createElement("mo",null,node.opening):null,
        createElement("mtable",null,...node.rows.map((cells,i)=>
          createElement("mtr",{key:i},...cells.map((cell,j)=>
            createElement("mtd",{key:j},render(cell)))))),
        node.closing?createElement("mo",null,node.closing):null);
  }
}

export function MathContent({text,className}:{text:string;className?:string}){
  const segments=splitMathContent(text);
  return <span className={["study-math-content",className].filter(Boolean).join(" ")}>
    {segments.map((part,i)=>part.kind==="text"
      ? <span key={i} className="study-math-prose">{part.value}</span>
      : part.parsed
        ? <span key={i} className={part.display?"study-math-display":"study-math-inline"}>
          {createElement("math",{display:part.display?"block":"inline","aria-label":part.source},render(part.parsed))}
        </span>
        : <code key={i} className="study-math-fallback" title="This LaTeX expression is not supported by the built-in renderer">{part.display?"\\[":"\\("}{part.source}{part.display?"\\]":"\\)"}</code>
    )}
  </span>;
}

export function MathPreview({source,label}:{source:string;label:string}){
  const parsed=parseMathExpression(source);
  return <div className="study-math-single-preview">
    <span className="section-kicker">{label}</span>
    {parsed?createElement("math",{display:"block","aria-label":source},render(parsed))
      :<code className="study-math-fallback">{source}</code>}
  </div>;
}
