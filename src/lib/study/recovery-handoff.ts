import type {OfflineCustody} from "./offline-recovery.ts";
import type {RecoveryReviewItemId} from "./recovery-acceptance-guide.ts";
import {RECOVERY_REVIEW_ITEMS} from "./recovery-acceptance-guide.ts";

/** Owner IDs, semester IDs, answers, exact queue payloads and OAuth
 * identities are deliberately absent. Caller controls clipboard disclosure. */
export function redactedRecoveryHandoff({
  custody,checked,activeSemesterPresent,
}:{
  custody:OfflineCustody;checked:ReadonlySet<RecoveryReviewItemId>;activeSemesterPresent:boolean;
}):string{
  const safeOwner=custody.status==="ready";
  const reviewed=RECOVERY_REVIEW_ITEMS.filter(x=>checked.has(x.id));
  const reviewLabels=reviewed.map(x=>x.id).join(", ")||"none";
  return [
    "StudyOS recovery handoff / local metadata only",
    "Owner custody: "+(safeOwner?"matched":"unverified or blocked"),
    "Browser queue: "+(safeOwner?custody.owned+" owner-matched records remain":"counts redacted"),
    "Foreign or legacy records: "+(safeOwner?(custody.otherOwner||custody.unowned?"present":"not observed"):"unverified"),
    "Semester context: "+(activeSemesterPresent?"active":"none confirmed"),
    "Checklist topics reviewed locally: "+reviewLabels,
    "Server receipt: NOT VERIFIED",
    "Original encrypted restore: NOT VERIFIED",
    "Physical-device, accessibility, two-owner OAuth/RLS and rights: OPEN",
    "Restore / staging / release / postrelease: NO_GO",
    "No source bytes, secrets, personal identifiers or academic answers included.",
  ].join("\n");
}
