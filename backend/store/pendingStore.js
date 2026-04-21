/**
 * In-memory store for pending (unconfirmed) AI-extracted transactions.
 * Keyed by senderId (WhatsApp phone number).
 *
 * Each entry:
 * {
 *   data: { date, amount, vendor, category, paymentMethod, platform },
 *   type: "INCOME" | "EXPENSE",
 *   timer: NodeJS.Timeout
 * }
 */

const AUTO_SAVE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const pending = new Map();

/**
 * Store a pending transaction and start the auto-save countdown.
 * @param {string} senderId
 * @param {"INCOME"|"EXPENSE"} type
 * @param {object} data  Extracted AI fields
 * @param {Function} onTimeout  Called with (senderId, type, data) after 5 min
 */
export function setPending(senderId, type, data, onTimeout) {
  clearPending(senderId); // cancel any existing timer first

  const timer = setTimeout(() => {
    const entry = pending.get(senderId);
    if (entry) {
      pending.delete(senderId);
      onTimeout(senderId, entry.type, entry.data);
    }
  }, AUTO_SAVE_TIMEOUT_MS);

  pending.set(senderId, { data, type, timer });
}

/**
 * Retrieve a pending entry without removing it.
 * @param {string} senderId
 * @returns {{ data: object, type: string, timer: NodeJS.Timeout } | undefined}
 */
export function getPending(senderId) {
  return pending.get(senderId);
}

/**
 * Remove a pending entry and cancel its timer.
 * @param {string} senderId
 */
export function clearPending(senderId) {
  const entry = pending.get(senderId);
  if (entry) {
    clearTimeout(entry.timer);
    pending.delete(senderId);
  }
}

/**
 * Check whether a senderId has a pending entry.
 * @param {string} senderId
 * @returns {boolean}
 */
export function hasPending(senderId) {
  return pending.has(senderId);
}
