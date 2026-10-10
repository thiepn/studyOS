"use client";

import {useMemo,useState} from "react";
import {declaredAuthorityLabel,filterSourceIndex,sourceStatusLabel,verifiedSource,
  type SourceIndexItem,type SourceFilter} from "@/lib/study/resource-desk";

export function SourceIndex({resources,courseNames}:{
  resources:SourceIndexItem[];courseNames:Record<string,string>;
}){
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState<SourceFilter["status"]>("all");
  const [type,setType]=useState("all");
  const types=useMemo(()=>[...new Set(resources.map(item=>item.resource_type))].sort(),[resources]);
  const results=useMemo(()=>filterSourceIndex(resources,{query,status,type}),[resources,query,status,type]);
  return <div className="source-index">
    <div className="source-index-filters" role="group" aria-label="Search registered academic sources">
      <label className="source-index-query"><span>Find a source</span>
        <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
          placeholder="Search filename, type or declared authority…" autoComplete="off"/></label>
      <label><span>Processing evidence</span>
        <select value={status} onChange={event=>setStatus(event.target.value as SourceFilter["status"])}>
          <option value="all">All statuses</option><option value="verified">Verified only</option>
          <option value="pending">Not yet verified</option></select></label>
      <label><span>Material type</span>
        <select value={type} onChange={event=>setType(event.target.value)}>
          <option value="all">All types</option>
          {types.map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}
        </select></label>
    </div>
    <div className="source-index-results">
      <p role="status" aria-live="polite" aria-atomic="true">
        {results.length} of {resources.length} registered sources shown
      </p>
      {(query||status!=="all"||type!=="all")?
        <button type="button" className="source-clear-filters" onClick={()=>{setQuery("");setStatus("all");setType("all");}}>Clear filters</button>:null}
    </div>
    {results.length?<ul className="source-index-list">
      {results.map(item=><li key={item.id}>
        <article className="source-index-record">
          <div className="source-index-record-main">
            <span className="source-index-category">{courseNames[item.course_id]??"Course"} · {item.resource_type.replaceAll("_"," ")}</span>
            <h3>{item.title}</h3>
            <p className="source-index-authority">{declaredAuthorityLabel(item.source_authority)} · A declared source category is not a copyright license or independent certification.</p>
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
              aria-label={"Open "+item.title+" in Google Drive (new tab)"}>Open original source <span aria-hidden="true">↗</span></a>
              :<span className="source-index-no-link">No source URL recorded</span>}
          </div>
        </article>
      </li>)}
    </ul>:<p className="source-index-empty" role="status">
      {resources.length?"No sources match these filters. Change the search or clear filters.":"No registered sources yet. Scan your connected Drive or register a real source file."}
    </p>}
  </div>;
}
