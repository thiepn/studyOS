/** Offline operator-controlled source custody check. Reads three actual files,
 * original signed receipts and externally supplied public trust roots. */
import {readFile} from "node:fs/promises";
import {auditF16SourceCustody} from "./f16-source-custody.mjs";
const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i===-1?null:args[i+1];};
if(["--packet","--roots","--files","--head"].some(k=>!get(k))){
  console.error("Usage: node scripts/audit-f16-source.mjs --packet external.json --roots independent.json --files /originals --head exactSHA");
  process.exitCode=2;
}else try{
  const report=await auditF16SourceCustody({
    packet:JSON.parse(await readFile(get("--packet"),"utf8")),
    trustRoots:JSON.parse(await readFile(get("--roots"),"utf8")),
    artifactDirectory:get("--files"),expectedHead:get("--head"),
  });
  console.log(JSON.stringify(report,null,2));
  if(report.integrity!=="verified")process.exitCode=1;
}catch{console.error("Original-byte custody is unavailable or invalid; all release and restore gates stay NO_GO.");process.exitCode=1;}
