"use client";

import {useMemo,useState} from "react";
import {declaredAuthorityLabel,filterSourceIndex,sourceStatusLabel,verifiedSource,
  type SourceIndexItem,type SourceFilter} from "@/lib/study/resource-desk";

export function SourceIndex({resources,courseNames,weekNumbers={},initialWeek=null}:{
  resources:(SourceIndexItem&{teaching_week_id?:string|null})[];courseNames:Record<string,string>;weekNumbers?:Record<string,number>;initialWeek?:number|null;
}){
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState<SourceFilter["status"]>("all");
  const [type,setType]=useState("all");
  const [course,setCourse]=useState("all");
  const [week,setWeek]=useState(initialWeek==null?"all":String(initialWeek));
  const availableWeeks=[...new Set(resources.flatMap(item=>item.teaching_week_id&&weekNumbers[item.teaching_week_id]!=null?[weekNumbers[item.teaching_week_id]]:[]))].sort((a,b)=>a-b);
  const types=useMemo(()=>[...new Set(resources.map(item=>item.resource_type))].sort(),[resources]);
  const results=useMemo(()=>filterSourceIndex(resources.filter(item=>(course==="all"||item.course_id===course)&&(week==="all"||String(item.teaching_week_id?weekNumbers[item.teaching_week_id]:"")===week)),{query,status,type}),[resources,query,status,type,course,week,weekNumbers]);
  return <div className="source-index">
    <div className="source-index-filters" role="group" aria-label="Search registered academic sources">
      <label className="source-index-query"><span>Find material</span>
        <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
          placeholder="Search filename, type or declared authority…" autoComplete="off"/></label>
      <label><span>Verification status</span>
        <select value={status} onChange={event=>setStatus(event.target.value as SourceFilter["status"])}>
          <option value="all">All statuses</option><option value="verified">Verified only</option>
          <option value="pending">Not yet verified</option></select></label>
      <label><span>Course</span><select value={course} onChange={event=>setCourse(event.target.value)}><option value="all">All courses</option>{Object.entries(courseNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label><span>Material type</span>
        <select value={type} onChange={event=>setType(event.target.value)}>
          <option value="all">All types</option>
          {types.map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}
        </select></label>
      {availableWeeks.length?<label><span>Teaching week</span><select value={week} onChange={event=>setWeek(event.target.value)}><option value="all">All weeks</option>{availableWeeks.map(number=><option key={number} value={number}>Week {number}</option>)}</select></label>:null}
    </div>
    <div className="source-index-results">
      <p role="status" aria-live="polite" aria-atomic="true">
        {results.length} of {resources.length} materials shown
      </p>
      {(query||status!=="all"||type!=="all"||course!=="all"||week!=="all")?
        <button type="button" className="source-clear-filters" onClick={()=>{setQuery("");setStatus("all");setType("all");setCourse("all");setWeek("all");}}>Clear filters</button>:null}
    </div>
    {results.length?<ul className="source-index-list">
      {results.map(item=><li key={item.id}>
        <article className="source-index-record">
          <div className="source-index-record-main">
            <span className="source-index-category">{courseNames[item.course_id]??"Course"} · {item.resource_type.replaceAll("_"," ")}</span>
            <h3>{item.title}</h3>
            <p className="source-index-authority">{declaredAuthorityLabel(item.source_authority)}{item.teaching_week_id&&weekNumbers[item.teaching_week_id]!=null?" · Week "+weekNumbers[item.teaching_week_id]:""}</p>
            <details className="source-index-fingerprint"><summary>Source authority details</summary><p>A declared source category is not a copyright license or independent certification.</p></details>
          </div>
          <div className="source-index-record-side">
            <strong className="source-index-evidence" data-verified={verifiedSource(item)}>
              {sourceStatusLabel(item.processing_status)}
            </strong>
            {item.content_sha256?<details className="source-index-fingerprint">
              <summary>Recorded file fingerprint</summary><code>{item.content_sha256}</code>
              <p>Stored source metadata; not an independent integrity attestation.</p>
            </details>:null}
            {item.drive_url?<a href={item.drive_url} target="_blank" rel="noopener noreferrer"
              aria-label={"Open "+item.title+" in Google Drive (new tab)"}>Open file <span aria-hidden="true">↗</span></a>
              :<span className="source-index-no-link">No source URL recorded</span>}
          </div>
        </article>
      </li>)}
    </ul>:<p className="source-index-empty" role="status">
      {resources.length?"No sources match these filters. Change the search or clear filters.":"No registered sources yet. Scan your connected Drive or register a real source file."}
    </p>}
  </div>;
}
