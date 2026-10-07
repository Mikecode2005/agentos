/**
 * Skill registry — discover, install, list skills
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  cpSync,
  statSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { SkillDefinition } from "@agentos/core";
import { AGENTOS_DIR, SKILLS_DIR } from "@agentos/core";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function parseSkillMarkdown(raw: string, id: string, skillPath?: string): SkillDefinition {
  let body = raw;
  const meta: Record<string, string | string[]> = {};

  if (raw.startsWith("---")) {
    const end = raw.indexOf("---", 3);
    if (end !== -1) {
      const front = raw.slice(3, end).trim();
      body = raw.slice(end + 3).trim();
      for (const line of front.split("\n")) {
        const m = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
        if (!m) continue;
        const key = m[1];
        let val: string | string[] = m[2].trim();
        if (val.startsWith("[") && val.endsWith("]")) {
          val = val
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
        } else {
          val = val.replace(/^["']|["']$/g, "");
        }
        meta[key] = val;
      }
    }
  }

  const name = (meta.name as string) || id;
  const description = (meta.description as string) || "";
  const tags = Array.isArray(meta.tags)
    ? meta.tags
    : typeof meta.tags === "string"
      ? meta.tags.split(",").map((s) => s.trim())
      : [];
  const tools = Array.isArray(meta.tools)
    ? meta.tools
    : typeof meta.tools === "string"
      ? meta.tools.split(",").map((s) => s.trim())
      : [];
  const triggers = Array.isArray(meta.triggers)
    ? meta.triggers
    : typeof meta.triggers === "string"
      ? meta.triggers.split(",").map((s) => s.trim())
      : [];

  return {
    id,
    name,
    description,
    version: (meta.version as string) || "0.1.0",
    tags,
    tools,
    triggers,
    body,
    path: skillPath,
  };
}

function loadSkillFromDir(dir: string, builtin = false): SkillDefinition | null {
  const skillFile = join(dir, "SKILL.md");
  if (!existsSync(skillFile)) return null;
  const id = basename(dir);
  const raw = readFileSync(skillFile, "utf-8");
  const skill = parseSkillMarkdown(raw, id, dir);
  skill.builtin = builtin;
  return skill;
}

export function builtinSkillsRoot(): string {
  const candidates = [
    join(__dirname, "..", "builtin"),
    join(__dirname, "..", "..", "builtin"),
    join(process.cwd(), "packages", "skills", "builtin"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

export function projectSkillsDir(projectRoot: string): string {
  return join(projectRoot, AGENTOS_DIR, SKILLS_DIR);
}

export function listSkills(projectRoot: string): SkillDefinition[] {
  const skills: SkillDefinition[] = [];
  const seen = new Set<string>();

  const projDir = projectSkillsDir(projectRoot);
  if (existsSync(projDir)) {
    for (const name of readdirSync(projDir)) {
      const dir = join(projDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const skill = loadSkillFromDir(dir, false);
      if (skill) {
        skills.push(skill);
        seen.add(skill.id);
      }
    }
  }

  const builtinRoot = builtinSkillsRoot();
  if (existsSync(builtinRoot)) {
    for (const name of readdirSync(builtinRoot)) {
      if (seen.has(name)) continue;
      const dir = join(builtinRoot, name);
      if (!statSync(dir).isDirectory()) continue;
      const skill = loadSkillFromDir(dir, true);
      if (skill) skills.push(skill);
    }
  }

  return skills;
}

export function getSkill(projectRoot: string, id: string): SkillDefinition | null {
  return listSkills(projectRoot).find((s) => s.id === id || s.name === id) ?? null;
}

export function installSkill(projectRoot: string, skillId: string): SkillDefinition {
  const builtinRoot = builtinSkillsRoot();
  const src = join(builtinRoot, skillId);
  if (!existsSync(src)) {
    const available = existsSync(builtinRoot)
      ? readdirSync(builtinRoot).filter((n) =>
          statSync(join(builtinRoot, n)).isDirectory()
        )
      : [];
    throw new Error(
      `Skill "${skillId}" not found. Available builtins: ${available.join(", ") || "(none)"}`
    );
  }

  const destDir = projectSkillsDir(projectRoot);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, skillId);
  cpSync(src, dest, { recursive: true });

  const skill = loadSkillFromDir(dest, false);
  if (!skill) throw new Error(`Failed to load installed skill: ${skillId}`);
  return skill;
}

export function matchSkills(projectRoot: string, query: string): SkillDefinition[] {
  const q = query.toLowerCase();
  return listSkills(projectRoot).filter((s) => {
    if (s.triggers?.some((t) => q.includes(t.toLowerCase()))) return true;
    if (s.tags?.some((t) => q.includes(t.toLowerCase()))) return true;
    if (q.includes(s.id) || q.includes(s.name.toLowerCase())) return true;
    return false;
  });
}

export function formatSkillForAgent(skill: SkillDefinition): string {
  return [
    `### Skill: ${skill.name}`,
    skill.description,
    "",
    skill.body.trim(),
    "",
  ].join("\n");
}
