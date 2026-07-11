/** Shared shape for persisted chat rows (localStorage DB + legacy keys). */

export type StoredChatMessageV1 = {
  content: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};
