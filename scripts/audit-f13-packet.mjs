import {readFile} from "node:fs/promises";
import {auditF13Packet} from "./f13-witness-audit.mjs";

const args=process.argv.slice(2);
const value=(name)=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const packetFile=value("--packet"),trustRootFile=value("--trust-root"),files=value("--files"),head=value("--head");
if(!packetFile||!trustRootFile||!files||!head){
  console.error("Usage: node scripts/audit-f13-packet.mjs --packet <json> --trust-root <externally-governed json> --files <evidence dir> --head <exact-commit>");
  process.exitCode=2;
}else{
  try{
    const packet=JSON.parse(await readFile(packetFile,"utf8"));
    const trustRoot=JSON.parse(await readFile(trustRootFile,"utf8"));
    const report=await auditF13Packet({packet,trustRoot,artifactDirectory:files,expectedHead:head});
    console.log(JSON.stringify(report,null,2));
    if(report.integrity!=="verified")process.exitCode=1;
  }catch{
    console.error("Evidence could not be parsed or audited; no approval asserted.");
    process.exitCode=1;
  }
}
