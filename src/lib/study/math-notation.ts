/**
 * A deliberately bounded TeX -> MathML syntax tree. Unsupported input stays
 * readable as source; never interpolate user-provided markup into the DOM.
 * No network, HTML parsing, eval, or extra font dependencies.
 */
export type MathNode =
  | { kind: "row"; children: MathNode[] }
  | { kind: "mi" | "mn" | "mo" | "mtext"; value: string }
  | { kind: "frac"; numerator: MathNode; denominator: MathNode }
  | { kind: "sqrt"; radicand: MathNode; index?: MathNode }
  | { kind: "script"; base: MathNode; sub?: MathNode; sup?: MathNode }
  | { kind: "table"; rows: MathNode[][]; opening: string; closing: string };

export type MathSegment =
  | { kind: "text"; value: string }
  | { kind: "math"; source: string; display: boolean; parsed: MathNode | null };

const GREEK: Record<string,string> = {
  alpha:"α",beta:"β",gamma:"γ",delta:"δ",epsilon:"ϵ",varepsilon:"ε",
  zeta:"ζ",eta:"η",theta:"θ",vartheta:"ϑ",iota:"ι",kappa:"κ",lambda:"λ",
  mu:"μ",nu:"ν",xi:"ξ",pi:"π",varpi:"ϖ",rho:"ρ",sigma:"σ",tau:"τ",
  upsilon:"υ",phi:"ϕ",varphi:"φ",chi:"χ",psi:"ψ",omega:"ω",
  Gamma:"Γ",Delta:"Δ",Theta:"Θ",Lambda:"Λ",Xi:"Ξ",Pi:"Π",
  Sigma:"Σ",Upsilon:"Υ",Phi:"Φ",Psi:"Ψ",Omega:"Ω",
};
const OPS: Record<string,string> = {
  times:"×",cdot:"⋅",pm:"±",mp:"∓",div:"÷",le:"≤",leq:"≤",ge:"≥",geq:"≥",
  ne:"≠",neq:"≠",approx:"≈",equiv:"≡",sim:"∼",cong:"≅",to:"→",rightarrow:"→",
  leftarrow:"←",leftrightarrow:"↔",Rightarrow:"⇒",Leftrightarrow:"⇔",
  in:"∈",notin:"∉",subset:"⊂",subseteq:"⊆",supset:"⊃",supseteq:"⊇",
  cup:"∪",cap:"∩",setminus:"∖",forall:"∀",exists:"∃",neg:"¬",
  land:"∧",lor:"∨",wedge:"∧",vee:"∨",partial:"∂",nabla:"∇",
  infty:"∞",infinity:"∞",emptyset:"∅",varnothing:"∅",
  sum:"∑",prod:"∏",int:"∫",oint:"∮",lim:"lim",
  ldots:"…",cdots:"⋯",dots:"…",ldotp:".",
  langle:"⟨",rangle:"⟩",lvert:"|",rvert:"|",
  ll:"≪",gg:"≫",oplus:"⊕",otimes:"⊗",
};
const IDENTIFIERS = new Set(["sin","cos","tan","log","ln","exp","max","min","sup","inf","det","ker","dim","gcd"]);
const SPACES = new Set([",",";",":","!","quad","qquad"," ","~"]);
const MAX_LENGTH=3200;
const MAX_TOKENS=1200;
const MAX_DEPTH=24;

function row(children: MathNode[]):MathNode {
  return children.length===1?children[0]:{kind:"row",children};
}
const leaf=(kind:"mi"|"mn"|"mo"|"mtext",value:string):MathNode=>({kind,value});

function splitAtTopLevel(body:string, separator:"row"|"cell"):string[] {
  const chunks:string[]=[];
  let start=0,depth=0;
  for(let i=0;i<body.length;i++){
    if(body[i]==="{")depth++;
    else if(body[i]==="}")depth=Math.max(0,depth-1);
    else if(depth===0&&separator==="cell"&&body[i]==="&"){
      chunks.push(body.slice(start,i));start=i+1;
    }else if(depth===0&&separator==="row"&&body.slice(i,i+2)==="\\\\"){
      chunks.push(body.slice(start,i));i++;start=i+1;
    }
  }
  chunks.push(body.slice(start));
  return chunks;
}

class Reader {
  private i=0;
  private count=0;
  constructor(private readonly src:string){}
  private fail():never{throw Error("Unsupported math syntax");}
  private peek(){return this.src[this.i]??"";}
  private skip(){while(/\s/.test(this.peek())&&this.i<this.src.length)this.i++;}
  private atom(depth:number):MathNode{
    if(depth>MAX_DEPTH || ++this.count>MAX_TOKENS)this.fail();
    this.skip();
    const c=this.peek();
    if(!c)this.fail();
    if(c==="{"){
      this.i++;
      const group=this.sequence("}",depth+1);
      if(this.peek()!=="}")this.fail();
      this.i++;
      return group;
    }
    if(c==="\\"){
      this.i++;
      const match=/^[a-zA-Z]+/.exec(this.src.slice(this.i));
      const command=match?match[0]:this.src[this.i]??"";
      this.i+=command.length;
      if(command==="frac"||command==="dfrac"||command==="tfrac"||command==="binom"){
        const numerator=this.atom(depth+1);
        const denominator=this.atom(depth+1);
        return {kind:"frac",numerator,denominator};
      }
      if(command==="sqrt"){
        this.skip();
        let index:MathNode|undefined;
        if(this.peek()==="["){
          this.i++;
          index=this.sequence("]",depth+1);
          if(this.peek()!=="]")this.fail();
          this.i++;
        }
        return {kind:"sqrt",radicand:this.atom(depth+1),index};
      }
      if(command==="text"||command==="mathrm"||command==="mathbf"||command==="mathit"||command==="mathbb"){
        this.skip();
        if(this.peek()!=="{")this.fail();
        this.i++;
        const start=this.i;
        let level=1;
        while(this.i<this.src.length&&level){
          if(this.src[this.i]==="{")level++;
          else if(this.src[this.i]==="}")level--;
          if(level)this.i++;
        }
        if(level)this.fail();
        const content=this.src.slice(start,this.i);
        this.i++;
        const alphabets:Record<string,string>={R:"ℝ",N:"ℕ",Q:"ℚ",Z:"ℤ",C:"ℂ"};
        return leaf(command==="text"?"mtext":"mi",command==="mathbb"&&alphabets[content]?alphabets[content]:content);
      }
      if(command==="left"||command==="right"){
        this.skip();
        if(this.peek()==="\\"){
          this.i++;
          const fence=/^[a-zA-Z]+/.exec(this.src.slice(this.i));
          if(!fence)this.fail();
          this.i+=fence[0].length;
          const fences:Record<string,string>={langle:"⟨",rangle:"⟩",lvert:"|",rvert:"|",lbrace:"{",rbrace:"}"};
          if(!fences[fence[0]])this.fail();
          return leaf("mo",fences[fence[0]]);
        }
        const fence=this.src[this.i++]??"";
        return leaf("mo",fence==="."?"":fence);
      }
      if(GREEK[command])return leaf("mi",GREEK[command]);
      if(OPS[command])return leaf("mo",OPS[command]);
      if(IDENTIFIERS.has(command))return leaf("mi",command);
      if(SPACES.has(command))return leaf("mtext",command==="quad"?"  ":" ");
      if(["{","}","_","^","%","$","&","#"].includes(command))return leaf("mo",command);
      this.fail();
    }
    if(/[0-9]/.test(c)){
      const number=/^[0-9]+(?:\.[0-9]+)?/.exec(this.src.slice(this.i));
      if(!number)this.fail();
      this.i+=number[0].length;
      return leaf("mn",number[0]);
    }
    if(/[A-Za-z]/.test(c)){
      this.i++;return leaf("mi",c);
    }
    if("+-=*/(),.<>|![]:;′∈≤≥≠∑∫∞∂→⇒∀∃πλμθ√×⋅".includes(c)){
      this.i++;return leaf("mo",c);
    }
    this.fail();
  }
  private attached(depth:number):MathNode{
    let base=this.atom(depth);
    let sub:MathNode|undefined,sup:MathNode|undefined;
    while(true){
      this.skip();
      const c=this.peek();
      if(c!=="_"&&c!=="^")break;
      this.i++;
      const value=this.atom(depth+1);
      if(c==="_"){
        if(sub)this.fail();
        sub=value;
      }else{
        if(sup)this.fail();
        sup=value;
      }
    }
    if(sub||sup)base={kind:"script",base,sub,sup};
    return base;
  }
  sequence(until:string|undefined,depth:number):MathNode{
    if(depth>MAX_DEPTH)this.fail();
    const children:MathNode[]=[];
    while(this.i<this.src.length){
      this.skip();
      if(!this.peek()||this.peek()===until)break;
      if(this.peek()==="}"||this.peek()==="]"||this.peek()==="_"||this.peek()==="^")this.fail();
      children.push(this.attached(depth+1));
    }
    return row(children);
  }
  parse(){
    const value=this.sequence(undefined,0);
    this.skip();
    if(this.i!==this.src.length)this.fail();
    return value;
  }
}

export function parseMathExpression(input:string):MathNode|null{
  if(!input.trim()||input.length>MAX_LENGTH)return null;
  try{
    const env=/^\\begin\{(aligned|matrix|pmatrix|bmatrix|cases)\}([\s\S]*)\\end\{\1\}$/.exec(input.trim());
    if(env){
      const cells=splitAtTopLevel(env[2],"row").map(part=>
        splitAtTopLevel(part,"cell").map(cell=>{
          const parsed=parseMathExpression(cell.trim());
          if(!parsed)throw Error("Bad alignment");
          return parsed;
        }),
      );
      if(cells.length>30 || cells.some(cols=>cols.length>12))return null;
      const fences:Record<string,[string,string]>={
        aligned:["",""],matrix:["",""],pmatrix:["(",")"],bmatrix:["[","]"],cases:["{",""],
      };
      return {kind:"table",rows:cells,opening:fences[env[1]][0],closing:fences[env[1]][1]};
    }
    return new Reader(input).parse();
  }catch{return null;}
}

/** Only explicit LaTeX delimiters opt into mathematical parsing. Regular
 * lecture prose, currency amounts and unsupported TeX remain readable. */
export function splitMathContent(input:string):MathSegment[]{
  if(!input)return [{kind:"text",value:""}];
  const output:MathSegment[]=[];
  const tokens:[string,string,boolean][]=[["\\[","\\]",true],["\\(","\\)",false],["$$","$$",true]];
  let i=0;
  while(i<input.length){
    let selected:{at:number;open:string;close:string;display:boolean}|null=null;
    for(const [open,close,display] of tokens){
      const at=input.indexOf(open,i);
      if(at!==-1&&(!selected||at<selected.at))selected={at,open,close,display};
    }
    if(!selected){output.push({kind:"text",value:input.slice(i)});break;}
    if(selected.at>i)output.push({kind:"text",value:input.slice(i,selected.at)});
    const start=selected.at+selected.open.length;
    const end=input.indexOf(selected.close,start);
    if(end<0){
      output.push({kind:"text",value:input.slice(selected.at)});
      break;
    }
    const source=input.slice(start,end).trim();
    output.push({kind:"math",source,display:selected.display,parsed:parseMathExpression(source)});
    i=end+selected.close.length;
  }
  return output;
}
