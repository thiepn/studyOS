"use client";

import {useMemo,useState} from "react";

export type DriveIntakeRow={
  id:string;course_id:string|null;title:string;status:string;
  detected_resource_type:string|null;detected_week_no:number|null;
  classification_confidence:number|null;drive_url:string|null;note:string|null;
};
export function DriveIntakeIndex({items,courseNames}:{
  items:DriveIntakeRow[];courseNames:Record<string,string>;
}){
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("all");
  const statuses=useMemo(()=>[...new Set(items.map(x=>x.status))].sort(),[items]);
  const filtered=useMemo(()=>items.filter(item=>(status==="all"||item.status===status)&&
    (!query.trim()||[item.title,item.status,item.detected_resource_type??"",courseNames[item.course_id??""]??""]
      .some(part=>part.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))),[items,status,query,courseNames]);
  return <div className="drive-intake-index">
    {items.length?<div className="source-index-filters source-intake-filters" role="group" aria-label="Filter Drive intake">
      <label className="source-index-query"><span>Search discovered files</span>
        <input value={query} type="search" onChange={event=>setQuery(event.target.value)} placeholder="Search filename or course…" /></label>
      <label><span>Discovery status</span><select value={status} onChange={event=>setStatus(event.target.value)}>
        <option value="all">All unresolved statuses</option>{statuses.map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}
      </select></label>
    </div>:null}
    {items.length?<p className="source-intake-count" role="status" aria-live="polite">{filtered.length} of {items.length} unresolved files shown</p>:null}
    {filtered.length?<ul className="source-intake-list">
      {filtered.map(item=><li key={item.id}>
        <article className="source-intake-record">
          <div><strong>{item.title}</strong>
            <p>{item.course_id?(courseNames[item.course_id]??"Course"):"Course not identified"}
              {" · "}{item.detected_resource_type?.replaceAll("_"," ")??"type not identified"}
              {item.detected_week_no?" · week "+item.detected_week_no:""}
            </p>
            {item.note?<p className="source-intake-note">{item.note}</p>:null}
          </div>
          <div className="source-intake-evidence">
            <strong>{item.status.replaceAll("_"," ")}</strong>
            {item.classification_confidence!=null?<span>
              Filename classification {Math.round(item.classification_confidence*100)}% · not independently verified
            </span>:<span>Not classified · no verification</span>}
            {item.drive_url?<a href={item.drive_url} target="_blank" rel="noopener noreferrer"
              aria-label={"Inspect original file "+item.title+" in Google Drive (new tab)"}>Inspect original file ↗</a>:null}
            <a href="#manual-registration">Manual registration instructions</a>
          </div>
        </article>
      </li>)}
    </ul>:<p className="source-index-empty" role="status">{items.length?"No unresolved Drive files match these filters.":"No unresolved Drive files. Run a scan to discover new material."}</p>}
    <p className="resource-stage-help">Discovery is metadata only. A filename classifier cannot approve source authority, copyright rights, or generated academic content. Manual registration is a separate, deliberate action.</p>
  </div>;
}
