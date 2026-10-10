/** F17 original-only read-only custody CLI. Never writes / signs / restores. */
import {readFile} from "node:fs/promises";
import {auditF17ExternalExchange} from "./f17-external-exchange.mjs";
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const required=["--f15","--f16","--exchange","--roots","--ledger","--ledger-roots","--files","--head"];
if(required.some(k=>!arg(k))){
  console.error("Provide --f15 --f16 --exchange --roots --ledger --ledger-roots --files --head from independent custody.");
  process.exitCode=2;
}else try{
  const load=async k=>JSON.parse(await readFile(arg(k),"utf8"));
  const verdict=await auditF17ExternalExchange({f15:await load("--f15"),f16:await load("--f16"),
    exchange:await load("--exchange"),roots:await load("--roots"),ledger:await load("--ledger"),
    ledgerRoots:await load("--ledger-roots"),artifactDirectory:arg("--files"),expectedHead:arg("--head")});
  console.log(JSON.stringify(verdict,null,2));
  if(verdict.integrity!=="verified")process.exitCode=1;
}catch{console.error("External original custody unavailable or invalid. Release and restore remain NO_GO.");process.exitCode=1;}
