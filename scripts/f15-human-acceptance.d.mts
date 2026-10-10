export declare const F15_DOMAINS:readonly string[];
export type F15Verdict={releaseAllowed:false;preRelease:"NO_GO";postRelease:"NO_GO";canRestore:false;canPurge:false;integrity:"rejected"|"verified";reasons:string[];details:Array<{domain:string;sourceKind:"synthetic"|"external";finding:"observed"|"blocked"|"unobserved"}>};
export declare function auditF15HumanAcceptance(options:{
  f14:any;originals:any;roots:any;artifactDirectory:string;expectedHead:string;now?:Date;
}):Promise<F15Verdict>;
