export declare const F17_DOMAINS:readonly string[];
export type F17Outcome={integrity:"verified"|"rejected";releaseAllowed:false;restoreAllowed:false;staging:"NO_GO";release:"NO_GO";postrelease:"NO_GO";reasons:string[];coverage:Array<{role:string;originKind:string;finding:string}>;packetCommitment?:string};
export declare function auditF17ExchangePacket(options:{exchange:any;roots:any[];ledger:any[];ledgerRoots:any[];artifactDirectory:string;expectedHead:string;expectedF15Digest:string;expectedF16Digest:string;now?:Date}):Promise<F17Outcome>;
export declare function auditF17ExternalExchange(options:{f15:any;f16:any;exchange:any;roots:any[];ledger:any[];ledgerRoots:any[];artifactDirectory:string;expectedHead:string;now?:Date}):Promise<F17Outcome>;
