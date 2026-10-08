/** An older local record without owner metadata is not safe to send to an account.
 * This is only a replay safety rule; authorization is enforced by the API. */
export function canReplayPending(ownerId:string|undefined,currentUser:string|null):boolean {
  return Boolean(ownerId && currentUser && ownerId===currentUser);
}
