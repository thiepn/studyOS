/** Optional user-selected academic course templates. These are not inserted
 * by initialization, account sign-in or deployment. Dates, ECTS, professor,
 * assessment format and curriculum evidence always come from real sources. */
export const THIRD_SEMESTER_PRESETS=[
  {id:"dgl",stableKey:"differentialgleichungen",displayName:"Differentialgleichungen",shortName:"DGL",sortOrder:10,courseKind:"major"},
  {id:"stoch",stableKey:"stochastik",displayName:"Stochastik",shortName:"Stoch",sortOrder:20,courseKind:"major"},
  {id:"ti",stableKey:"theoretische_informatik",displayName:"Theoretische Informatik",shortName:"TI",sortOrder:30,courseKind:"major"},
  {id:"amp",stableKey:"algorithmische_mathematik_programmieren",displayName:"Algorithmische Mathematik und Programmieren",shortName:"AMP",sortOrder:40,courseKind:"major"},
] as const;

export function availablePresets(existingKeys:readonly string[]){
  const present=new Set(existingKeys);
  return THIRD_SEMESTER_PRESETS.filter(p=>!present.has(p.stableKey));
}
