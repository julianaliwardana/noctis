import { db } from "@noctis/db";
import type { AgentRun } from "@noctis/db";

export interface AgentRunInput {
  task: string;
  model?: string;
  status: string;
  contextTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  summary?: string;
  client?: string;
}

export function create(userId: string, data: AgentRunInput): Promise<AgentRun> {
  return db.agentRun.create({ data: { ...data, userId } });
}

/** Newest first; `end` is exclusive. */
export function findInRange(userId: string, start: Date, end: Date, task?: string): Promise<AgentRun[]> {
  return db.agentRun.findMany({
    where: { userId, createdAt: { gte: start, lt: end }, ...(task ? { task: { equals: task, mode: "insensitive" } } : {}) },
    orderBy: { createdAt: "desc" },
  });
}
