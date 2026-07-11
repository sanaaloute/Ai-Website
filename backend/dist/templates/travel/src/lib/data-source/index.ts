/**
 * Data Source
 *
 * Schema-driven data access. All API routes go through this layer so that
 * Prisma is never called directly from route handlers. The mapping from a
 * collection name to its Prisma delegate lives in `@/lib/schema` (generated).
 */

import { PrismaDataSource } from "./prisma-source";
import type { DataSource } from "./types";

export type { DataSource, ListOptions, Where, UserRecord } from "./types";

/** Singleton instance used across all API routes */
export const dataSource: DataSource = new PrismaDataSource();
