/**
 * Sandbox Client Session Tracker
 *
 * Problem: When a new sandbox is created (e.g., proactive renewal), stale closures,
 * pending async operations, and cached refs still hold the OLD sandbox ID. This causes
 * 404 "Sandbox doesn't exist" errors because the system sends requests with dead IDs.
 *
 * Solution: A module-level tracker that stores the ONE current sandbox ID.
 * Every time setSandboxData() is called with a new sandbox, this is updated
 * synchronously (before any async operations can race). Any function about to
 * make an API call can validate its expected ID against the current session.
 *
 * Rule: "In no case should the system use an old sandbox ID when a new one exists."
 *
 * IMPORTANT: This file must NOT import any server-only modules (fs, sandbox-manager, etc.)
 * because it is imported by client components.
 */

import type { SandboxData } from '@/hooks/useWorkspaceSandbox';

let currentSandboxId: string | null = null;

/** Cache the most-recently created sandbox so init/renewal flows can recover state. */
let lastCreatedSandbox: SandboxData | null = null;

/** Update the globally-known current sandbox ID. Called synchronously by setSandboxData. */
export function setCurrentSandboxId(id: string | null) {
  if (id !== currentSandboxId) {
    if (currentSandboxId && id) {
      console.log(
        `[sandboxSession] Session changed: ${currentSandboxId} → ${id}`
      );
    } else if (id) {
      console.log(`[sandboxSession] Session started: ${id}`);
    } else if (currentSandboxId) {
      console.log(`[sandboxSession] Session cleared (was ${currentSandboxId})`);
    }
    currentSandboxId = id;
  }
}

/** Read the current sandbox ID (null if none active). */
export function getCurrentSandboxId(): string | null {
  return currentSandboxId;
}

/** Check whether the given ID matches the current session. */
/**
 * Validate that an expected sandbox ID is still current before making an API call.
 * Returns true if the operation should proceed, false if it should abort.
 */
export function assertCurrentSandboxId(
  expectedId: string,
  operation: string
): boolean {
  if (!expectedId) return false;
  if (currentSandboxId && currentSandboxId !== expectedId) {
    console.warn(
      `[sandboxSession] ${operation}: expected ${expectedId} but current session is ${currentSandboxId}. Aborting.`
    );
    return false;
  }
  return true;
}

/**
 * Get the current sandbox ID from the URL (?sandbox=...).
 * More reliable than captured state because the URL is updated immediately
 * via replaceState when a new sandbox is created.
 */
function getSandboxIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get('sandbox');
  } catch {
    return null;
  }
}

/**
 * Strict validation: the expected ID must match BOTH the session tracker
 * AND the URL query parameter. This catches cases where the URL was updated
 * but a stale closure hasn't seen the new state yet.
 */
export function assertCurrentSandboxIdStrict(
  expectedId: string,
  operation: string
): boolean {
  if (!assertCurrentSandboxId(expectedId, operation)) return false;
  const urlId = getSandboxIdFromUrl();
  if (urlId && urlId !== expectedId) {
    console.warn(
      `[sandboxSession] ${operation}: expected ${expectedId} but URL has ${urlId}. Aborting.`
    );
    return false;
  }
  return true;
}

/** Update the last-created sandbox cache (used by useSandboxInitialization). */
export function setLastCreatedSandbox(data: SandboxData | null) {
  lastCreatedSandbox = data;
}

/** Read the last-created sandbox cache. */
export function getLastCreatedSandbox(): SandboxData | null {
  return lastCreatedSandbox;
}
