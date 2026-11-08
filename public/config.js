// yof demo: the browser's settings, as an AI assistant might write them.
//
// >>> DELIBERATE VULNERABILITY 4 (a secret-named setting sent to every visitor's browser) <<<
// Anything in this file reaches anyone who opens the page, so a setting named like a secret must never be here.
// The value is a made-up placeholder for this demo: it is not a key and unlocks nothing. `yof check` flags the line
// (rule secret.named_env) because of where it is and what it is called. The fix: delete the line, and keep the real
// key in the server's environment, where the browser never sees it.
window.DEMO_CONFIG = {
  VITE_API_URL: "http://localhost:3000/api",
  VITE_PAYMENTS_SECRET_KEY: "demo-only-not-a-real-key-7f3a9c2e",
};
