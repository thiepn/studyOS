type IconName="today"|"courses"|"study"|"assistant"|"progress"|"settings"|"account"|"book"|"clock";
const paths:Record<IconName,string>={
 clock:"M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2",
 today:"M5 4h14v16H5z M8 2v4 M16 2v4 M5 9h14 M8 13h3 M8 16h6",
 courses:"M4 5h6l2 2h8v13H4z M4 5V3h6l2 2",
 study:"m9 4 11 8-11 8z",
 assistant:"m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
 progress:"M4 20V4 M4 20h16 M8 16v-5 M13 16V7 M18 16V3",
 settings:"M4 7h16 M4 17h16 M9 4v6 M15 14v6",
 account:"M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3",
 book:"M5 3h14v18H5z M8 3v18 M11 7h5 M11 11h5",
};
export function WorkspaceIcon({name}:{name:IconName}){return <svg className="workspace-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;}
