/** Read-only local operator reconciliation. Never creates keys or approval. */
import {readFile} from "node:fs/promises";
import {auditF14Review} from "./f14-evidence-review.mjs";
const args=process.argv.slice(2);
const value=(k)=>{const p=args.indexOf(k);return p>=0?args[p+1]:undefined;};
const required=["--packet","--witness-root","--review","--reviewer-root","--custody","--custodian-root","--files","--head"];
if(required.some(x=>!value(x))){
  console.error("Provide --packet --witness-root --review --reviewer-root --custody --custodian-root --files --head from separately governed external sources.");
  process.exitCode=2;
}else try{
  const read=async x=>JSON.parse(await readFile(value(x),"utf8"));
  const outcome=await auditF14Review({packet:await read("--packet"),witnessTrustRoot:await read("--witness-root"),
    review:await read("--review"),reviewerTrustRoot:await read("--reviewer-root"),
    custody:await read("--custody"),custodianTrustRoot:await read("--custodian-root"),
    artifactDirectory:value("--files"),expectedHead:value("--head")});
  console.log(JSON.stringify(outcome,null,2));
  if(outcome.integrity!=="verified")process.exitCode=1;
}catch{console.error("F14 external reviewer evidence is unavailable or invalid; approval remains OPEN.");process.exitCode=1;}
