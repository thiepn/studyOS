"use client";
import {useEffect,useRef,type ReactNode} from "react";
/** Progressive disclosure that keeps existing section deep links usable. */
export function ContextDetails({id,title,children}:{id:string;title:string;children:ReactNode}){
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const reveal=()=>{let hash=location.hash.slice(1);try{hash=decodeURIComponent(hash);}catch{/* Malformed links must not break the workspace. */}const target=document.getElementById(hash);if(target&&ref.current?.contains(target)){ref.current.open=true;target.scrollIntoView({block:"start"});}};reveal();window.addEventListener("hashchange",reveal);return()=>window.removeEventListener("hashchange",reveal);},[]);
 return <details id={id} ref={ref} className="today-drawer"><summary>{title}</summary><div className="today-drawer-body">{children}</div></details>;
}
