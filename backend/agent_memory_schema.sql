-- Clean setup for agent persistence tables.
-- WARNING: This drops existing tables and recreates them from scratch.
-- Only run this if you are okay losing existing agent checkpoints,
-- generation logs, pending writes, and agent memories.

DROP TABLE IF EXISTS agent_writes CASCADE;
DROP TABLE IF EXISTS agent_checkpoints CASCADE;
DROP TABLE IF EXISTS agent_memories CASCADE;
DROP TABLE IF EXISTS project_generations CASCADE;

-- ---------------------------------------------------------------------------
-- Generation runs
-- ---------------------------------------------------------------------------
CREATE TABLE project_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  thread_id TEXT NOT NULL,
  prompt TEXT,
  workflow TEXT,
  status TEXT NOT NULL DEFAULT 'started',
  error TEXT,
  summary TEXT,
  preview_url TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_generations_user_project
  ON project_generations(user_id, project_id, created_at DESC);

CREATE INDEX idx_project_generations_thread
  ON project_generations(thread_id);

-- ---------------------------------------------------------------------------
-- LangGraph checkpoints
-- ---------------------------------------------------------------------------
CREATE TABLE agent_checkpoints (
  id BIGSERIAL PRIMARY KEY,
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  checkpoint TEXT NOT NULL,
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thread_id, checkpoint_ns, checkpoint_id)
);

CREATE INDEX idx_agent_checkpoints_thread
  ON agent_checkpoints(thread_id, checkpoint_ns, created_at DESC);

-- ---------------------------------------------------------------------------
-- LangGraph pending writes
-- ---------------------------------------------------------------------------
CREATE TABLE agent_writes (
  id BIGSERIAL PRIMARY KEY,
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  channel TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

CREATE INDEX idx_agent_writes_thread
  ON agent_writes(thread_id, checkpoint_ns, checkpoint_id);

-- ---------------------------------------------------------------------------
-- Agent long-term memory
-- ---------------------------------------------------------------------------
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_memories_lookup
  ON agent_memories(user_id, project_id, memory_type);
