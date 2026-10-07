/**
 * Skill CLI subcommands
 */
import { listSkills, installSkill, getSkill } from "@agentos/skills";

export function runSkillCommand(args: string[], cwd: string): void {
  const sub = args[0];
  if (sub === "list") {
    const skills = listSkills(cwd);
    console.log("");
    console.log("  🧰 Skills");
    console.log("");
    if (skills.length === 0) {
      console.log("  No skills found.");
    } else {
      for (const s of skills) {
        const flag = s.builtin ? "builtin" : "installed";
        console.log(`  ${s.id.padEnd(14)} ${s.description.slice(0, 60)}`);
        console.log(
          `                 └ ${flag}${s.tags?.length ? " · " + s.tags.join(", ") : ""}`
        );
      }
    }
    console.log("");
    console.log("  Install: agentos skill install github");
    console.log("");
    return;
  }
  if (sub === "install") {
    const name = args[1];
    if (!name) {
      console.error("Usage: agentos skill install <name>");
      process.exit(1);
    }
    const skill = installSkill(cwd, name);
    console.log("");
    console.log(`  ✓ Installed skill: ${skill.name}`);
    console.log(`    ${skill.description}`);
    console.log(`    path: ${skill.path}`);
    console.log("");
    return;
  }
  if (sub === "show") {
    const name = args[1];
    if (!name) {
      console.error("Usage: agentos skill show <name>");
      process.exit(1);
    }
    const skill = getSkill(cwd, name);
    if (!skill) {
      console.error(`Skill not found: ${name}`);
      process.exit(1);
    }
    console.log("");
    console.log(`  # ${skill.name}`);
    console.log(`  ${skill.description}`);
    console.log("");
    console.log(skill.body);
    console.log("");
    return;
  }
  console.error("Usage: agentos skill list | install <name> | show <name>");
  process.exit(1);
}
