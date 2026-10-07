#!/usr/bin/env node
/**
 * AgentOS localhost dashboard
 *   agentos dashboard [--port 3847]
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isInitialized, MemoryStore } from "@agentos/memory";
import { listSkills } from "@agentos/skills";
import { listTeams } from "@agentos/runtime";
import { listConnectedAdapters } from "@agentos/agents";
import { AGENTOS_VERSION } from "@agentos/core";

const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const PORT = portIdx >= 0 ? parseInt(args[portIdx + 1] || "3847", 10) : 3847;
const ROOT = process.cwd();

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

function html(res: ServerResponse, body: string) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

async function getSnapshot() {
  if (!isInitialized(ROOT)) {
    return { initialized: false, version: AGENTOS_VERSION, root: ROOT };
  }
  const store = new MemoryStore(ROOT);
  await store.init();
  const stats = store.stats();
  const recent = store.list().slice(-12).reverse();
  const skills = listSkills(ROOT).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    builtin: s.builtin,
  }));
  const teams = listTeams(ROOT);
  const adapters = listConnectedAdapters(ROOT);
  return {
    initialized: true,
    version: AGENTOS_VERSION,
    root: ROOT,
    stats,
    recent: recent.map((e) => ({
      id: e.id,
      type: e.type,
      content: e.content.slice(0, 200),
      source: e.source,
      author: e.author,
      createdAt: e.createdAt,
      commit: e.evidence?.commit,
    })),
    skills,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      agents: t.agents.map((a) => a.role),
      createdAt: t.createdAt,
    })),
    adapters,
  };
}

function pageShell(dataAttr: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgentOS Dashboard</title>
  <style>
    :root {
      --bg: #0b0f14; --panel: #12181f; --border: #1e2732;
      --text: #e7eef7; --muted: #8b9bb0; --accent: #5b9dff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: radial-gradient(1200px 600px at 10% -10%, #152033 0%, var(--bg) 55%);
      color: var(--text); min-height: 100vh;
    }
    header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border);
    }
    header h1 { margin: 0; font-size: 1.15rem; }
    header .meta { color: var(--muted); font-size: 0.85rem; }
    main {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem; padding: 1.25rem 1.75rem 2.5rem;
    }
    .card {
      background: var(--panel); border: 1px solid var(--border);
      border-radius: 12px; padding: 1rem 1.1rem;
    }
    .card h2 {
      margin: 0 0 0.75rem; font-size: 0.75rem; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--muted);
    }
    .stat { font-size: 1.75rem; font-weight: 600; }
    .row {
      display: flex; justify-content: space-between; padding: 0.35rem 0;
      border-bottom: 1px solid var(--border); font-size: 0.9rem;
    }
    .row:last-child { border-bottom: 0; }
    .pill {
      display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px;
      background: #1a2430; color: var(--accent); font-size: 0.75rem;
    }
    .muted { color: var(--muted); }
    .mem { font-size: 0.85rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
    .mem:last-child { border-bottom: 0; }
    .wide { grid-column: 1 / -1; }
    code { font-family: ui-monospace, monospace; font-size: 0.85em; }
  </style>
</head>
<body>
  <header>
    <h1>🧠 AgentOS</h1>
    <div class="meta" id="header-meta">loading…</div>
  </header>
  <main id="root">Loading…</main>
  <script>
    const data = ${dataAttr};
    const root = document.getElementById('root');
    const meta = document.getElementById('header-meta');
    meta.textContent = 'v' + data.version + ' · ' + (data.root || '');
    if (!data.initialized) {
      root.innerHTML = '<div class="card wide"><h2>Not initialized</h2><p>Run <code>agentos init</code>.</p></div>';
    } else {
      const s = data.stats || {};
      const byType = Object.entries(s.byType || {}).filter(([,c]) => c > 0)
        .map(([t,c]) => '<div class="row"><span>'+t+'</span><span>'+c+'</span></div>').join('');
      const skills = (data.skills || []).map(x =>
        '<div class="row"><span>'+x.id+'</span><span class="pill">'+(x.builtin?'builtin':'local')+'</span></div>'
      ).join('') || '<p class="muted">No skills</p>';
      const teams = (data.teams || []).map(t =>
        '<div class="row"><span>'+t.name+'</span><span class="muted">'+(t.agents||[]).join(', ')+'</span></div>'
      ).join('') || '<p class="muted">No teams</p>';
      const mems = (data.recent || []).map(m =>
        '<div class="mem"><span class="pill">'+m.type+'</span> '+escapeHtml(m.content)+
        '<div class="muted" style="margin-top:0.25rem">'+(m.createdAt||'').slice(0,10)+
        (m.commit?' · '+m.commit:'')+'</div></div>'
      ).join('') || '<p class="muted">No memories yet</p>';
      root.innerHTML = [
        '<div class="card"><h2>Memory</h2><div class="stat">'+(s.total||0)+'</div><p class="muted">embeddings '+(s.withEmbeddings||0)+'</p>'+byType+'</div>',
        '<div class="card"><h2>Agents</h2><div class="stat">'+(data.adapters||[]).length+'</div><p class="muted">'+(data.adapters||[]).join(', ')||'none'+'</p></div>',
        '<div class="card"><h2>Skills</h2>'+skills+'</div>',
        '<div class="card"><h2>Teams</h2>'+teams+'</div>',
        '<div class="card wide"><h2>Recent memories</h2>'+mems+'</div>',
      ].join('');
    }
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
  </script>
</body>
</html>`;
}

async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || "/";
  if (url.startsWith("/api/health")) {
    return json(res, 200, { ok: true, version: AGENTOS_VERSION });
  }
  if (url.startsWith("/api/snapshot")) {
    try {
      return json(res, 200, await getSnapshot());
    } catch (err) {
      return json(res, 500, { error: String(err) });
    }
  }
  if (url === "/" || url.startsWith("/index")) {
    try {
      const snap = await getSnapshot();
      return html(res, pageShell(JSON.stringify(snap)));
    } catch (err) {
      return html(res, `<pre>${String(err)}</pre>`);
    }
  }
  json(res, 404, { error: "not found" });
}

const server = createServer((req, res) => {
  void handler(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("  🧠 AgentOS dashboard");
  console.log(`  → http://127.0.0.1:${PORT}`);
  console.log(`  project: ${ROOT}`);
  console.log("");
  console.log("  API: /api/snapshot  /api/health");
  console.log("  Ctrl+C to stop");
  console.log("");
});
