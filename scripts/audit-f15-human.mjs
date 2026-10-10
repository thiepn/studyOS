/** Local read-only intake; root governance and approvals remain external. */
import {readFile} from "node:fs/promises";
import {auditF15HumanAcceptance} from "./f15-human-acceptance.mjs";
const args=process.argv.slice(2);
const flag=k=>{const p=args.indexOf(k);return p<0?null:args[p+1];};
const names=["--packet","--witness-root","--review","--reviewer-root","--custody",
  "--custodian-root","--originals","--human-roots","--files","--head"];
if(names.some(k=>!flag(k))){console.error("Provide all F14 witness/reviewer/custody paths plus --originals --human-roots --files --head.");process.exitCode=2;}
else try{
  const read=async k=>JSON.parse(await readFile(flag(k),"utf8"));
  const report=await auditF15HumanAcceptance({f14:{
    packet:await read("--packet"),witnessTrustRoot:await read("--witness-root"),
    review:await read("--review"),reviewerTrustRoot:await read("--reviewer-root"),
    custody:await read("--custody"),custodianTrustRoot:await read("--custodian-root"),
  },originals:await read("--originals"),roots:await read("--human-roots"),
  artifactDirectory:flag("--files"),expectedHead:flag("--head")});
  console.log(JSON.stringify(report,null,2));
  if(report.integrity!=="verified")process.exitCode=1;
}catch{console.error("F15 independent human/device evidence was unavailable or invalid; all release gates remain NO_GO.");process.exitCode=1;}
