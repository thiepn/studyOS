"use client";
import {useEffect,useRef,type ReactNode} from "react";
export function MaterialDialog({children}:{children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const open=()=>{if(window.location.hash==="#manual-registration"&&!dialog.current?.open)dialog.current?.showModal();};open();window.addEventListener("hashchange",open);return()=>window.removeEventListener("hashchange",open);},[]);
 const close=()=>{dialog.current?.close();if(window.location.hash==="#manual-registration")history.replaceState(history.state,"",location.pathname+location.search);};
 return <><button type="button" className="primary-button" onClick={()=>dialog.current?.showModal()}>Add material</button><dialog ref={dialog} className="material-dialog" aria-labelledby="add-material-title" onCancel={close} onClick={event=>{if(event.target===dialog.current){const rect=dialog.current.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();}}}><div className="dialog-heading"><h2 id="add-material-title">Add material</h2><button className="dialog-close" type="button" onClick={close} aria-label="Close add material">×</button></div><p className="muted">Choose a course and week, then register a Google Drive file. To discover files automatically, use your connected Drive.</p>{children}</dialog></>;
}
