export type SourceIndexItem={
  id:string;course_id:string;title:string;resource_type:string;processing_status:string;
  source_authority:string;drive_url:string|null;content_sha256:string|null;
  published_at:string|null;
};
export type SourceFilter={query:string;status:"all"|"verified"|"pending";type:string};
const STATUSES:Record<string,string>={
  new:"Registered · not verified",classified:"Classified · not verified",
  extracted:"Extracted · not verified",mapped:"Mapped · not verified",
  needs_review:"Needs review · not verified",
  archived:"Archived · not verified",verified:"Verified source",
};
const AUTHORITIES:Record<string,string>={
  official_course:"Declared official course",official_solution:"Declared official solution",
  assigned_reference:"Declared assigned reference",reference:"Declared external reference",
  ai_generated:"Declared AI-generated",unknown:"Authority unknown",
};
export function sourceStatusLabel(status:string){return STATUSES[status]??"Unrecognized status · not verified";}
export function declaredAuthorityLabel(authority:string){return AUTHORITIES[authority]??"Unrecognized authority";}
export function verifiedSource(item:Pick<SourceIndexItem,"processing_status">){return item.processing_status==="verified";}
export function resourceDeskSummary(items:readonly SourceIndexItem[],queued:number,candidates:number,intake:number){
  const verified=items.filter(verifiedSource).length;
  return {registered:items.length,verified,pending:items.length-verified,
    queued:Math.max(0,queued),candidates:Math.max(0,candidates),intake:Math.max(0,intake)};
}
/** Operates only on caller-provided, pre-authorized and semester/course-scoped rows. */
export function filterSourceIndex<T extends SourceIndexItem>(items:readonly T[],filter:SourceFilter):T[]{
  const query=filter.query.trim().toLocaleLowerCase();
  return items.filter(item=>
    (filter.status==="all"||verifiedSource(item)===(filter.status==="verified")) &&
    (filter.type==="all"||item.resource_type===filter.type) &&
    (!query||[item.title,item.resource_type,item.source_authority,item.processing_status]
      .some(part=>part.toLocaleLowerCase().includes(query)))
  );
}
