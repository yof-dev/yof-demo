/**
 * yof demo: a tiny notes app with FIVE planted problems, for trying yof on something that is safe to break.
 *
 * >>> DELIBERATE VULNERABILITIES, FOR PRACTICE ONLY. NEVER DEPLOY THIS APP. <<<
 * Each one is marked "DELIBERATE VULNERABILITY" where it lives, and README.md lists them:
 *   1. IDOR             GET /api/notes/:id does not check who owns the note (yof attack: attack.tenant_read)
 *   2. Open route       GET /api/profile answers without a sign-in, as account A (yof attack: attack.auth_bypass)
 *   3. No headers       the pages are sent without security headers (yof attack: attack.missing_headers)
 *   4. Key in the page  public/config.js hands the browser a setting named like a secret (yof check: secret.named_env).
 *                       The value is a made-up placeholder that unlocks nothing.
 *   5. Old package      package.json pins lodash 4.17.20, which has published advisories (yof check: package.vulnerable).
 *                       The app never loads it, so nothing of it runs here.
 * Start with YOF_DEMO_FIXED=1 to run the fixed version of 1 to 3 and watch those findings go away; 4 and 5 are fixed
 * in the files themselves (see README.md).
 *
 * Harmless on purpose: it listens on 127.0.0.1 and ::1 only (never on your network), keeps notes in memory (gone when
 * it stops), has no database, no real accounts and loads no packages. The three sign-in tokens below are made-up demo
 * values that only this app accepts.
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";

// Demo accounts: made-up tokens, only meaningful to this app.
const ACCOUNTS = { "demo-token-a": "a", "demo-token-b": "b", "demo-token-admin": "admin" };
const NAMES = { a: "Demo account A", b: "Demo account B", admin: "Demo admin" };

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'self'",
};

const CONFIG_JS = readFileSync(fileURLToPath(new URL("./public/config.js", import.meta.url)), "utf8");

function who(req) {
  const m = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
  return m ? ACCOUNTS[m[1]] ?? null : null;
}

async function readJson(req) {
  let text = "";
  for await (const chunk of req) { text += chunk; if (text.length > 10_000) return null; }
  try { return JSON.parse(text || "{}"); } catch { return null; }
}

/** The app's request handler. `fixed` turns on the fixes for problems 1 to 3. */
export function createHandler({ fixed = false } = {}) {
  const notes = new Map();   // id -> { owner, title }
  let nextId = 1;

  function send(res, status, body, type = "application/json") {
    // >>> DELIBERATE VULNERABILITY 3 (missing security headers) <<<
    // The pages go out without the headers unless the app runs fixed. The API answers always carry them.
    const page = type !== "application/json";
    const headers = page && !fixed ? {} : { ...SECURITY_HEADERS };
    res.writeHead(status, { ...headers, "Content-Type": `${type}; charset=utf-8` });
    res.end(type === "application/json" ? JSON.stringify(body) : body);
  }

  return async function handle(req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;

    if (path === "/" && req.method === "GET") return send(res, 200, "<!doctype html><title>yof demo notes</title><script src=\"/config.js\"></script><h1>yof demo notes</h1><p>A practice app for yof. See the README.</p>", "text/html");
    if (path === "/config.js" && req.method === "GET") return send(res, 200, CONFIG_JS, "text/javascript");
    if (path === "/login" && req.method === "GET") return send(res, 200, "<!doctype html><title>Sign in</title><p>The demo signs in with a token header. See the README.</p>", "text/html");
    if (!path.startsWith("/api/")) return send(res, 404, { error: "not found" });

    if (path === "/api/profile" && req.method === "GET") {
      // >>> DELIBERATE VULNERABILITY 2 (a route that answers without a sign-in) <<<
      // A leftover shortcut: with no sign-in it answers as account A. The fix is to refuse instead (401).
      const user = who(req) ?? (fixed ? null : "a");
      if (!user) return send(res, 401, { error: "sign in first" });
      return send(res, 200, { account: user, name: NAMES[user], plan: "demo-plan-team" });
    }

    const user = who(req);
    if (!user) return send(res, 401, { error: "sign in first" });

    if (path === "/api/me" && req.method === "GET") return send(res, 200, { account: user });

    if (path === "/api/notes" && req.method === "POST") {
      const body = await readJson(req);
      if (!body || typeof body.title !== "string") return send(res, 400, { error: "title is required" });
      const id = String(nextId++);
      notes.set(id, { owner: user, title: body.title.slice(0, 500) });
      return send(res, 201, { id });
    }
    if (path === "/api/notes" && req.method === "GET") {
      return send(res, 200, { notes: [...notes].filter(([, n]) => n.owner === user).map(([id, n]) => ({ id, title: n.title })) });
    }

    const m = /^\/api\/notes\/([0-9]+)$/.exec(path);
    if (m) {
      const id = m[1];
      const note = notes.get(id);
      if (req.method === "GET") {
        // >>> DELIBERATE VULNERABILITY 1 (IDOR: anyone signed in reads any note by its id) <<<
        // The owner check is missing here unless the app runs fixed. The fix is the second half of this condition.
        if (!note || (fixed && note.owner !== user)) return send(res, 404, { error: "not found" });
        return send(res, 200, { id, title: note.title });
      }
      if (!note || note.owner !== user) return send(res, 404, { error: "not found" });
      if (req.method === "PATCH") {
        const body = await readJson(req);
        if (!body || typeof body.title !== "string") return send(res, 400, { error: "title is required" });
        note.title = body.title.slice(0, 500);
        return send(res, 200, { id, title: note.title });
      }
      if (req.method === "DELETE") { notes.delete(id); res.writeHead(204, SECURITY_HEADERS); return res.end(); }
    }

    if (path === "/api/admin/users" && req.method === "GET") {
      if (user !== "admin") return send(res, 403, { error: "admins only" });
      return send(res, 200, { users: [{ id: "a", name: NAMES.a }, { id: "b", name: NAMES.b }] });
    }

    return send(res, 404, { error: "not found" });
  };
}

// Run directly (npm start): this machine only, the IPv4 and IPv6 loopback addresses, so http://localhost works
// whichever one it resolves to. Imported (the tests), it only exports createHandler.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const PORT = Number(process.env.PORT ?? 3000);
  const FIXED = process.env.YOF_DEMO_FIXED === "1";
  const handle = createHandler({ fixed: FIXED });
  createServer(handle).listen(PORT, "127.0.0.1", () => {
    console.log(`yof demo notes on http://localhost:${PORT} (${FIXED ? "fixed" : "with the planted problems"})`);
  });
  createServer(handle).on("error", () => {}).listen(PORT, "::1");
}
