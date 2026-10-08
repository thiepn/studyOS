export type ProofAnchor = { label:string; offset:number; line:number };

const SECTION=/^\s*((?:(?:step|case)\s+\d+|lemma(?:\s+\d+)?|claim(?:\s+\d+)?|assumption|assume|proof|conclusion|therefore|induction(?:\s+(?:base|step))?)\b[^:\n]{0,65}[:.]?)/i;

/** Derive a navigable outline from the user's own working text.
 * No extra state or second notes store is required. */
export function outlineProof(text:string):ProofAnchor[]{
  const anchors:ProofAnchor[]=[];
  const lines=text.split("\n");
  let offset=0;
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const match=SECTION.exec(line);
    if(match && anchors.length<32){
      anchors.push({label:match[1].trim().slice(0,72),offset,line:i+1});
    }
    offset+=line.length+1;
  }
  return anchors;
}
