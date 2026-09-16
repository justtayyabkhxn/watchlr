/**
 * What counts as a dead want-to-watch row.
 *
 * Shared by the audit route and the home-page gate that decides whether to
 * offer the dig at all. If these two disagreed, the card would appear on the
 * home page and then report that there's nothing to dig up — so the rule
 * lives in exactly one place.
 */

/** Untouched this long and it isn't a plan any more, it's furniture. */
export const STALE_DAYS = 7;

/** Below this, a stale pile is just a short list — not a graveyard. */
export const STALE_MIN_PILE = 5;

/** Hard cap on one dig: bounds both the prompt and the bulk clear. */
export const MAX_DIG = 40;

/** The cutoff: rows last touched before this are fair game. */
export function STALE_BEFORE(now: Date = new Date()): Date {
  return new Date(now.getTime() - STALE_DAYS * 86_400_000);
}
