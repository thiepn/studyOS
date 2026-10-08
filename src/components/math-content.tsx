import type { ReactNode } from "react";
import { parseMathExpression, splitMathContent, type MathNode } from "@/lib/study/math-notation";

/**
 * Native MathML renderer. Every token becomes a React text node; source data
 * can never inject HTML. Broken/unsupported TeX displays as literal source.
 */
function Node({node}:{node:MathNode}):ReactNode{
  switch(node.kind){
    case "mi":return <mi>{node.value}</mi>;
    case "mn":return <mn>{node.value}</mn>;
    case "mo":return <mo>{node.value}</mo>;
    case "mtext":return <mtext>{node.value}</mtext>;
    case "row":return <mrow>{node.children.map((child,i)=><Node key={i} node={child}/>)}</mrow>;
    case "frac":return <mfrac><Node node={node.numerator}/><Node node={node.denominator}/></mfrac>;
    case "sqrt":
      return node.index
        ? <mroot><Node node={node.radicand}/><Node node={node.index}/></mroot>
        : <msqrt><Node node={node.radicand}/></msqrt>;
    case "script":
      return node.sub&&node.sup
        ? <msubsup><Node node={node.base}/><Node node={node.sub}/><Node node={node.sup}/></msubsup>
        : node.sub
          ? <msub><Node node={node.base}/><Node node={node.sub}/></msub>
          : <msup><Node node={node.base}/><Node node={node.sup!}/></msup>;
    case "table":
      return <mrow>
        {node.opening?<mo>{node.opening}</mo>:null}
        <mtable>{node.rows.map((cells,i)=><mtr key={i}>{cells.map((cell,j)=><mtd key={j}><Node node={cell}/></mtd>)}</mtr>)}</mtable>
        {node.closing?<mo>{node.closing}</mo>:null}
      </mrow>;
  }
}

export function MathContent({text,className}:{text:string;className?:string}){
  const segments=splitMathContent(text);
  return <span className={["study-math-content",className].filter(Boolean).join(" ")}>
    {segments.map((part,i)=>part.kind==="text"
      ? <span key={i} className="study-math-prose">{part.value}</span>
      : part.parsed
        ? <span key={i} className={part.display?"study-math-display":"study-math-inline"}>
          <math display={part.display?"block":"inline"} aria-label={part.source}>
            <Node node={part.parsed}/>
          </math>
        </span>
        : <code key={i} className="study-math-fallback" title="This LaTeX expression is not supported by the built-in renderer">{part.display?"\\[":"\\("}{part.source}{part.display?"\\]":"\\)"}</code>
    )}
  </span>;
}

export function MathPreview({source,label}:{source:string;label:string}){
  // An explicit preview may show a raw TeX body, even without delimiters.
  const parsed=parseMathExpression(source);
  return <div className="study-math-single-preview">
    <span className="section-kicker">{label}</span>
    {parsed?<math display="block" aria-label={source}><Node node={parsed}/></math>
      :<code className="study-math-fallback">{source}</code>}
  </div>;
}
