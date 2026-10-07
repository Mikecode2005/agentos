/**
 * @agentos/runtime — Micro-workers & multi-agent orchestration
 */

export {
  WorkerPool,
  registerBuiltinHandlers,
} from "./workers.js";
export type { TaskHandler, WorkerPoolOptions } from "./workers.js";

export {
  createTeam,
  listTeams,
  getTeam,
  runTeamGoal,
  SOFTWARE_TEAM_ROLES,
} from "./teams.js";
export type { TeamRunResult } from "./teams.js";
