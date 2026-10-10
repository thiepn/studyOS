/** TypeScript contract for the read-only Node.js witness auditor.
 * It does not authorize release or give imported evidence an owner. */
export type F13AuditOutcome={
  integrity:"verified"|"rejected";
  releaseAllowed:false;
  sourceQualified:boolean;
  reasons:string[];
  caseCoverage:Array<{id:string;result:"passed"|"blocked"|"unobserved"}>;
  artifacts:number;
  sourceClass?:"synthetic"|"external";
  packetSha256?:string;
};
export declare const F13_REQUIRED_CASES:readonly string[];
export declare function auditF13Packet(options:{
  packet:unknown;trustRoot:unknown;artifactDirectory:string;expectedHead:string;now?:Date;
}):Promise<F13AuditOutcome>;
