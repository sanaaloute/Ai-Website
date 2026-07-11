"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildToolSet = buildToolSet;
exports.buildReadOnlyToolSet = buildReadOnlyToolSet;
exports.buildPlanningToolSet = buildPlanningToolSet;
exports.buildDebugToolSet = buildDebugToolSet;
const read_file_1 = require("./implementations/read_file");
const write_file_1 = require("./implementations/write_file");
const list_files_1 = require("./implementations/list_files");
const delete_file_1 = require("./implementations/delete_file");
const search_replace_1 = require("./implementations/search_replace");
const update_todos_1 = require("./implementations/update_todos");
const grep_1 = require("./implementations/grep");
const run_type_checks_1 = require("./implementations/run_type_checks");
const add_dependency_1 = require("./implementations/add_dependency");
const copy_file_1 = require("./implementations/copy_file");
const rename_file_1 = require("./implementations/rename_file");
const web_search_1 = require("./implementations/web_search");
const web_crawl_1 = require("./implementations/web_crawl");
const code_search_1 = require("./implementations/code_search");
const edit_file_1 = require("./implementations/edit_file");
const read_logs_1 = require("./implementations/read_logs");
const fetch_preview_1 = require("./implementations/fetch_preview");
const add_integration_1 = require("./implementations/add_integration");
const execute_sql_1 = require("./implementations/execute_sql");
const get_supabase_project_info_1 = require("./implementations/get_supabase_project_info");
const get_supabase_table_schema_1 = require("./implementations/get_supabase_table_schema");
const save_project_1 = require("./implementations/save_project");
const query_manifest_1 = require("./implementations/query_manifest");
const update_manifest_1 = require("./implementations/update_manifest");
const setup_pocketbase_1 = require("./implementations/setup_pocketbase");
const run_command_1 = require("./implementations/run_command");
__exportStar(require("./types"), exports);
__exportStar(require("./sandbox-provider"), exports);
__exportStar(require("./file-manifest"), exports);
__exportStar(require("./stream-writer"), exports);
__exportStar(require("./tool-definitions"), exports);
__exportStar(require("./tool-executor"), exports);
__exportStar(require("./tool-loop"), exports);
function buildToolSet(context, docsTools = []) {
    return [
        new read_file_1.ReadFileTool(context),
        new write_file_1.WriteFileTool(context),
        new edit_file_1.EditFileTool(context),
        new list_files_1.ListFilesTool(context),
        new delete_file_1.DeleteFileTool(context),
        new copy_file_1.CopyFileTool(context),
        new rename_file_1.RenameFileTool(context),
        new search_replace_1.SearchReplaceTool(context),
        new update_todos_1.UpdateTodosTool(context),
        new grep_1.GrepTool(context),
        new code_search_1.CodeSearchTool(context),
        new web_search_1.WebSearchTool(context),
        new web_crawl_1.WebCrawlTool(context),
        new add_dependency_1.AddDependencyTool(context),
        new run_type_checks_1.RunTypeChecksTool(context),
        new read_logs_1.ReadLogsTool(context),
        new fetch_preview_1.FetchPreviewTool(context),
        new add_integration_1.AddIntegrationTool(context),
        new execute_sql_1.ExecuteSqlTool(context),
        new get_supabase_project_info_1.GetSupabaseProjectInfoTool(context),
        new get_supabase_table_schema_1.GetSupabaseTableSchemaTool(context),
        new save_project_1.SaveProjectTool(context),
        new query_manifest_1.QueryManifestTool(context),
        new update_manifest_1.UpdateManifestTool(context),
        new setup_pocketbase_1.SetupPocketBaseTool(context),
        new run_command_1.RunCommandTool(context),
        ...docsTools,
    ];
}
function buildReadOnlyToolSet(context, docsTools = []) {
    return [
        new read_file_1.ReadFileTool(context),
        new list_files_1.ListFilesTool(context),
        new grep_1.GrepTool(context),
        new code_search_1.CodeSearchTool(context),
        new web_search_1.WebSearchTool(context),
        new web_crawl_1.WebCrawlTool(context),
        new read_logs_1.ReadLogsTool(context),
        new query_manifest_1.QueryManifestTool(context),
        ...docsTools,
    ];
}
function buildPlanningToolSet(context, docsTools = []) {
    const readOnlyDocsTools = docsTools.filter((tool) => tool.name !== 'shadcn_install' && tool.name !== 'shadcn_init');
    return [
        new read_file_1.ReadFileTool(context),
        new list_files_1.ListFilesTool(context),
        new grep_1.GrepTool(context),
        new code_search_1.CodeSearchTool(context),
        new web_search_1.WebSearchTool(context),
        new web_crawl_1.WebCrawlTool(context),
        new query_manifest_1.QueryManifestTool(context),
        new update_todos_1.UpdateTodosTool(context),
        ...readOnlyDocsTools,
    ];
}
function buildDebugToolSet(context, docsTools = []) {
    return [
        new read_file_1.ReadFileTool(context),
        new write_file_1.WriteFileTool(context),
        new edit_file_1.EditFileTool(context),
        new list_files_1.ListFilesTool(context),
        new delete_file_1.DeleteFileTool(context),
        new copy_file_1.CopyFileTool(context),
        new rename_file_1.RenameFileTool(context),
        new search_replace_1.SearchReplaceTool(context),
        new update_todos_1.UpdateTodosTool(context),
        new grep_1.GrepTool(context),
        new code_search_1.CodeSearchTool(context),
        new web_search_1.WebSearchTool(context),
        new web_crawl_1.WebCrawlTool(context),
        new add_dependency_1.AddDependencyTool(context),
        new run_type_checks_1.RunTypeChecksTool(context),
        new read_logs_1.ReadLogsTool(context),
        new fetch_preview_1.FetchPreviewTool(context),
        new add_integration_1.AddIntegrationTool(context),
        new execute_sql_1.ExecuteSqlTool(context),
        new get_supabase_project_info_1.GetSupabaseProjectInfoTool(context),
        new get_supabase_table_schema_1.GetSupabaseTableSchemaTool(context),
        new save_project_1.SaveProjectTool(context),
        new query_manifest_1.QueryManifestTool(context),
        new update_manifest_1.UpdateManifestTool(context),
        new setup_pocketbase_1.SetupPocketBaseTool(context),
        new run_command_1.RunCommandTool(context),
        ...docsTools,
    ];
}
//# sourceMappingURL=index.js.map