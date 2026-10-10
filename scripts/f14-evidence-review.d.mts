export type F14AuditOutcome={integrity:"verified"|"rejected";intake:"blocked"|"incomplete"|"ready_for_owner_review";releaseAllowed:false;ownerDecision:"OPEN";reasons:string[];caseCoverage:Array<{id:string;result:"observed"|"blocked"|"unobserved"}>;packetSha256?:string;reviewSha256?:string};
export declare function auditF14Review(options:{
  packet:any;witnessTrustRoot:any;review:any;reviewerTrustRoot:any;custody:any;custodianTrustRoot:any;artifactDirectory:string;expectedHead:string;now?:Date;
}):Promise<F14AuditOutcome>;
