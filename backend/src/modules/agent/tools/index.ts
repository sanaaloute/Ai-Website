/**
 * Tool registry for the agent workflow.
 */

import type { AgentContext } from "../types";
import type { StructuredTool } from "@langchain/core/tools";

import { ReadFileTool } from "./implementations/read_file";
import { WriteFileTool } from "./implementations/write_file";
import { ListFilesTool } from "./implementations/list_files";
import { DeleteFileTool } from "./implementations/delete_file";
import { SearchReplaceTool } from "./implementations/search_replace";
import { UpdateTodosTool } from "./implementations/update_todos";
import { GrepTool } from "./implementations/grep";
import { RunTypeChecksTool } from "./implementations/run_type_checks";
import { AddDependencyTool } from "./implementations/add_dependency";
import { CopyFileTool } from "./implementations/copy_file";
import { RenameFileTool } from "./implementations/rename_file";
import { WebSearchTool } from "./implementations/web_search";
import { WebCrawlTool } from "./implementations/web_crawl";
import { CodeSearchTool } from "./implementations/code_search";
import { EditFileTool } from "./implementations/edit_file";
import { ReadLogsTool } from "./implementations/read_logs";
import { FetchPreviewTool } from "./implementations/fetch_preview";
import { AddIntegrationTool } from "./implementations/add_integration";
import { ExecuteSqlTool } from "./implementations/execute_sql";
import { GetSupabaseProjectInfoTool } from "./implementations/get_supabase_project_info";
import { GetSupabaseTableSchemaTool } from "./implementations/get_supabase_table_schema";
import { SaveProjectTool } from "./implementations/save_project";
import { QueryManifestTool } from "./implementations/query_manifest";
import { SetupPocketBaseTool } from "./implementations/setup_pocketbase";
import { RunCommandTool } from "./implementations/run_command";

// Note: RunCommandTool is not part of the original 27 tools, but it is required
// so the executor/debugger can run arbitrary shell commands (npm run build,
// custom scripts, etc.) that have no dedicated tool.

export * from "./types";
export type { AgentContext } from "../types";
export * from "./sandbox-provider";
export * from "./file-manifest";
export * from "./stream-writer";
export * from "./tool-definitions";
export * from "./tool-executor";
export * from "./tool-loop";

/** Full tool set for the execute node (code writing + all utilities) */
export function buildToolSet(context: AgentContext, docsTools: StructuredTool[] = []): StructuredTool[] {
  // shadcn components are pre-installed deterministically by the template
  // selector (one batched CLI call) — the executor must not loop model-driven
  // install calls mid-generation (interactive-prompt stalls, repeated work).
  const filteredDocsTools = docsTools.filter(
    (tool) => tool.name !== 'shadcn_install' && tool.name !== 'shadcn_init',
  );

  return [
    new ReadFileTool(context),
    new WriteFileTool(context),
    new EditFileTool(context),
    new ListFilesTool(context),
    new DeleteFileTool(context),
    new CopyFileTool(context),
    new RenameFileTool(context),
    new SearchReplaceTool(context),
    new UpdateTodosTool(context),
    new GrepTool(context),
    new CodeSearchTool(context),
    new WebSearchTool(context),
    new WebCrawlTool(context),
    new AddDependencyTool(context),
    new RunTypeChecksTool(context),
    new ReadLogsTool(context),
    new FetchPreviewTool(context),
    new AddIntegrationTool(context),
    new ExecuteSqlTool(context),
    new GetSupabaseProjectInfoTool(context),
    new GetSupabaseTableSchemaTool(context),
    new SaveProjectTool(context),
    new QueryManifestTool(context),
    new SetupPocketBaseTool(context),
    new RunCommandTool(context),
    ...filteredDocsTools,
  ];
}

/**
 * Read-only tool set for the reviewer node (exploration + verification, no
 * modifications). Includes run_type_checks so the reviewer can actually run
 * the tsc audit its prompt requires, and strips the sandbox-mutating shadcn
 * install/init MCP tools — the same guard the planning toolset applies.
 */
export function buildReadOnlyToolSet(context: AgentContext, docsTools: StructuredTool[] = []): StructuredTool[] {
  const readOnlyDocsTools = docsTools.filter(
    (tool) => tool.name !== 'shadcn_install' && tool.name !== 'shadcn_init',
  );

  return [
    new ReadFileTool(context),
    new ListFilesTool(context),
    new GrepTool(context),
    new CodeSearchTool(context),
    new WebSearchTool(context),
    new WebCrawlTool(context),
    new ReadLogsTool(context),
    new QueryManifestTool(context),
    new RunTypeChecksTool(context),
    ...readOnlyDocsTools,
  ];
}

/**
 * STRICT planning tool set for the plan node.
 * The planner MUST NOT have any file-writing tools — its only job is to READ
 * the codebase and output a JSON plan.  Write/edit/create/delete tools are
 * executor-only and must never be bound to the planner model.
 */
export function buildPlanningToolSet(context: AgentContext, docsTools: StructuredTool[] = []): StructuredTool[] {
  // Planning is read-only. Remove shadcn install/init tools because the planner
  // must never mutate the sandbox — it only selects components and writes the plan.
  const readOnlyDocsTools = docsTools.filter(
    (tool) => tool.name !== 'shadcn_install' && tool.name !== 'shadcn_init',
  );

  return [
    new ReadFileTool(context),
    new ListFilesTool(context),
    new GrepTool(context),
    new CodeSearchTool(context),
    new WebSearchTool(context),
    new WebCrawlTool(context),
    new QueryManifestTool(context),
    new UpdateTodosTool(context),
    ...readOnlyDocsTools,
  ];
}

/**
 * Debug tool set for the debugger node.
 * The debugger now has the same full tool access as the executor so it can
 * fix review issues comprehensively (add imports, wire integrations, add
 * dependencies, etc.) — not just build/type errors.
 */
export function buildDebugToolSet(context: AgentContext, docsTools: StructuredTool[] = []): StructuredTool[] {
  return buildToolSet(context, docsTools);
}
