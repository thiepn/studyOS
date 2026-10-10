/** Browser-only human handoff checklist. No checklist selection can grant
 * restore, change a session, waive original-source rights, or release. */
export const RECOVERY_REVIEW_ITEMS=[
  {id:"original",label:"Original archive and prior-stable bytes available through separate custody"},
  {id:"owner",label:"Original account and distinct second-account denial reviewed"},
  {id:"device",label:"Physical accessibility and keyboard/screen-reader witness evidence retained"},
  {id:"approval",label:"Separate source-rights and prerelease/postrelease human decision receipts retained"},
] as const;
export type RecoveryReviewItemId=(typeof RECOVERY_REVIEW_ITEMS)[number]["id"];
export function reviewReadiness(checked:ReadonlySet<RecoveryReviewItemId>){
  const remaining=RECOVERY_REVIEW_ITEMS.filter(item=>!checked.has(item.id));
  return {status:remaining.length?"REVIEW_PENDING":"AWAITING_INDEPENDENT_VERIFICATION",
    remaining:remaining.map(item=>item.id),canRestore:false as const,canDeploy:false as const,
    note:remaining.length
      ?"Document each missing original source outside the browser; don't clear queued work."
      :"Checklist complete locally. Signed original files, custody authority and independent approvals are still unverified."};
}
