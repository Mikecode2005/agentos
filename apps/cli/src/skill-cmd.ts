/**
 * Skill CLI subcommands
 */
import {
  listSkills,
  installSkill,
  getSkill,
  matchSkills,
  formatSkillForAgent,
} from "@agentos/skills";

export function runSkillCommand(args: string[], cwd: string): void {
  const sub = args[0];
  if (sub === "list") {
    const skills = listSkills(cwd);
    console.log("\n  🧰 Skills\n");
    if (skills.length === 0) console.log("  No skills found.");
    else {
      for (const s of skills) {
        const flag = s.builtin ? "builtin" : "installed";
        console.log(`  ${s.id.padEnd(14)} ${s.description.slice(0, 60)}`);
        console.log(
          `                 └ ${flag}${s.tags?.length ? " · " + s.tags.join(", ") : ""}`
        );
      }
    }
    console.log("\n  Install: agentos skill install github");
    console.log('  Apply:   agentos skill apply "debug auth race"\n');
    return;
  }
  if (sub === "install") {
    const name = args[1];
    if (!name) {
      console.error("Usage: agentos skill install <name>");
      process.exit(1);
    }
    const skill = installSkill(cwd, name);
    console.log(`\n  ✓ Installed skill: ${skill.name}\n    ${skill.description}\n`);
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
    console.log(`\n  # ${skill.name}\n  ${skill.description}\n\n${skill.body}\n`);
    return;
  }
  if (sub === "apply" || sub === "match") {
    const query = args.slice(1).join(" ").trim();
    if (!query) {
      console.error('Usage: agentos skill apply "task description"');
      process.exit(1);
    }
    const maybeId = args[1];
    const forced = maybeId ? getSkill(cwd, maybeId) : null;
    const skills = forced ? [forced] : matchSkills(cwd, query);
    if (skills.length === 0) {
      console.log("\n  No matching skills.\n");
      return;
    }
    console.log(`\n  Matched ${skills.length} skill(s) for: ${query}\n`);
    for (const s of skills) console.log(formatSkillForAgent(s));
    return;
  }
  console.error(
    "Usage: agentos skill list | install <name> | show <name> | apply <query>"
  );
  process.exit(1);
}
