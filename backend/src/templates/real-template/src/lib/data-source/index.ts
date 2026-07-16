/**
 * Data Source
 *
 * SQLite-only implementation using Prisma ORM.
 */

import { PrismaDataSource } from "./prisma-source";
import type { DataSource } from "./types";

export type { DataSource };
export * from "./types";

/** Singleton instance used across all API routes */
export const dataSource: DataSource = new PrismaDataSource();
