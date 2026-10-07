/**
 * Micro-worker pool — lightweight in-process task queue.
 */

import { randomUUID } from "node:crypto";
import type { WorkerTask, WorkerStatus } from "@agentos/core";

export type TaskHandler = (task: WorkerTask) => Promise<unknown> | unknown;

export interface WorkerPoolOptions {
  concurrency?: number;
}

export class WorkerPool {
  private handlers = new Map<string, TaskHandler>();
  private queue: WorkerTask[] = [];
  private running = 0;
  private concurrency: number;
  private tasks = new Map<string, WorkerTask>();

  constructor(options: WorkerPoolOptions = {}) {
    this.concurrency = options.concurrency ?? 4;
  }

  register(type: string, handler: TaskHandler): void {
    this.handlers.set(type, handler);
  }

  submit(type: string, input: Record<string, unknown>, agentId?: string): WorkerTask {
    if (!this.handlers.has(type)) {
      throw new Error(`No handler registered for task type: ${type}`);
    }
    const task: WorkerTask = {
      id: randomUUID(),
      type,
      input,
      status: "pending",
      agentId,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    this.queue.push(task);
    void this.pump();
    return task;
  }

  get(id: string): WorkerTask | undefined {
    return this.tasks.get(id);
  }

  list(status?: WorkerStatus): WorkerTask[] {
    const all = [...this.tasks.values()];
    return status ? all.filter((t) => t.status === status) : all;
  }

  private async pump(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.running++;
      void this.runOne(task).finally(() => {
        this.running--;
        void this.pump();
      });
    }
  }

  private async runOne(task: WorkerTask): Promise<void> {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      task.status = "failed";
      task.error = `No handler for ${task.type}`;
      task.completedAt = new Date().toISOString();
      return;
    }
    task.status = "running";
    task.startedAt = new Date().toISOString();
    try {
      task.result = await handler(task);
      task.status = "completed";
    } catch (err) {
      task.status = "failed";
      task.error = err instanceof Error ? err.message : String(err);
    }
    task.completedAt = new Date().toISOString();
  }
}

export function registerBuiltinHandlers(
  pool: WorkerPool,
  deps: {
    searchMemory?: (query: string) => unknown;
    whyMemory?: (query: string) => unknown;
    addMemory?: (text: string) => unknown;
  } = {}
): void {
  pool.register("memory.search", async (task) => {
    const q = String(task.input.query ?? "");
    if (!deps.searchMemory) return { error: "memory not wired" };
    return deps.searchMemory(q);
  });
  pool.register("memory.why", async (task) => {
    const q = String(task.input.query ?? "");
    if (!deps.whyMemory) return { error: "memory not wired" };
    return deps.whyMemory(q);
  });
  pool.register("memory.add", async (task) => {
    const text = String(task.input.content ?? "");
    if (!deps.addMemory) return { error: "memory not wired" };
    return deps.addMemory(text);
  });
  pool.register("echo", async (task) => task.input);
  pool.register("agent.plan", async (task) => {
    const goal = String(task.input.goal ?? "unspecified");
    return {
      goal,
      steps: [
        { agent: "researcher", action: "gather context", goal },
        { agent: "coder", action: "implement", goal },
        { agent: "reviewer", action: "review changes", goal },
        { agent: "tester", action: "verify", goal },
      ],
    };
  });
}
