<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/yof-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset=".github/assets/yof-logo-light.svg">
    <img alt="yof" src=".github/assets/yof-logo-light.svg" width="220">
  </picture>
</p>

<p align="center"><strong>Security checks for apps you build with AI</strong></p>

<p align="center">Catch leaked keys, open databases and risky packages before you ship. Free and open source.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@yof/cli"><img alt="@yof/cli on npm" src="https://img.shields.io/npm/v/@yof/cli?label=%40yof%2Fcli"></a>
  <a href="./LICENSE"><img alt="Licence: Apache-2.0" src="https://img.shields.io/badge/licence-Apache--2.0-blue"></a>
  <a href="https://yof.io/benchmark"><img alt="Benchmark" src="https://img.shields.io/badge/benchmark-results-36c98a"></a>
  <a href="https://yof.io"><img alt="yof.io" src="https://img.shields.io/badge/web-yof.io-0c0d11"></a>
</p>

# yof demo

A tiny notes app with **five planted problems**, so you can try [yof](https://yof.io) on something that is safe to break. Run it on your machine, watch `yof check` and `yof attack` find the problems, then fix them and watch the findings go away.

> **This app is insecure on purpose. Never deploy it, never put it on a public address, and never copy its code into a real app.** Every planted problem is marked `DELIBERATE VULNERABILITY` where it lives.

It is harmless by design: it listens on this machine only (127.0.0.1 and ::1), keeps notes in memory, has no database and no real accounts, and loads no packages. The three sign-in tokens and the "key" in `public/config.js` are made-up demo values that unlock nothing anywhere.

## The planted problems (on purpose)

| # | Where | What is wrong | What finds it |
| --- | --- | --- | --- |
| 1 | `server.mjs`, `GET /api/notes/:id` | No owner check: account B reads account A's note by its id (an IDOR) | `yof attack`: one user can read another user's records |
| 2 | `server.mjs`, `GET /api/profile` | Answers without a sign-in, as account A (a leftover shortcut) | `yof attack`: a signed-in route answers without a sign-in |
| 3 | `server.mjs`, the pages | Sent without security headers | `yof attack`: security headers are missing |
| 4 | `public/config.js` | A setting named like a secret, sent to every visitor's browser (the value is a placeholder) | `yof check`: browser-visible setting named like a secret |
| 5 | `package.json` | Pins lodash 4.17.20, an old version with published advisories (the app never loads it) | `yof check`: this version has a known security problem |

## Try it (5 minutes, Node 20 or newer)

**1. The check** (keys and packages; it reads the files, the app doesn't need to run):

```sh
npx @yof/cli check
```

It reports problem 4 (fix this week) and problem 5 (lodash, with the advisory's id and the version that fixes it). It asks the public npm registry and OSV about the dependency's name and version; nothing else leaves your machine.

**2. The attack.** Start the app:

```sh
npm start                       # the app on http://localhost:3000
```

In a second terminal, give yof the demo's three test accounts and attack it:

```sh
export YOF_ATTACK_A="Bearer demo-token-a"
export YOF_ATTACK_B="Bearer demo-token-b"
export YOF_ATTACK_ADMIN="Bearer demo-token-admin"
npx @yof/cli attack http://localhost:3000
```

yof reads `.yof/attack.json` (the app, your written consent, the accounts and the routes) and reports problems 1, 2 and 3, each with the request that showed it.

**3. Fix and check again.** Run the fixed version of the server and attack it again: problems 1 to 3 are gone.

```sh
npm run start:fixed
```

Each fix is one condition in `server.mjs`, next to its `DELIBERATE VULNERABILITY` note. Add `--write-tests` to the attack and yof writes a regression test that fails while a problem is there and passes once it is fixed.

For problems 4 and 5, edit the files: delete the secret-named line from `public/config.js` (a real key belongs in the server's environment), and change lodash to `4.17.21` or newer in `package.json` (or remove it, since nothing uses it). Run `npx @yof/cli check` again and both are gone.

## Let Patch fix it

Make your own copy of this repository (it is a template), run `npm install` once and commit the `package-lock.json` it writes (yof's repository checks read lockfiles to see which versions you really install), then link the repository in the [yof app](https://app.yof.io) and turn on Patch. For problem 5, Patch opens a draft pull request on a new branch that moves lodash to the smallest fixed version on the same major line and tells you the one command to run (`npm install`) so `package-lock.json` follows; it never edits the lockfile by hand. You review it and merge it: Patch never merges, approves, deletes or force-pushes. The problems Patch has no safe fix for come with a fix prompt you can paste into your AI assistant.

## Also try

- **In your editor:** the yof extension for VS Code, Cursor and Windsurf shows problems 4 and 5 in Problems when you save, and "yof: Attack my app" runs the attack above in the background. Set `yof.attack.envFile` to `yof-accounts.example` to use the demo accounts. Install links: [yof.io/get](https://yof.io/get).
- **On every pull request:** `.github/workflows/yof.yml` runs `yof check`, and `.github/workflows/yof-attack.yml` starts the app and attacks it. Both are expected to report the planted problems until you fix them.

## In your own app

Copy `.yof/attack.json`, change `app`, the consent sentence (it must name your app, word for word), the routes and the record shape. Create two test accounts (A and B, plus an admin if you have one) and keep their tokens in your CI secrets, never in the repository. See the [yof docs](https://yof.io/docs#attack).

## Licence

Apache 2.0.
