#!/usr/bin/env node
// ============================================================================
//  scripts/upload-to-browserstack.js  —  turn a local .apk/.ipa into a bs:// URL.
// ============================================================================
//  Usage:
//    npm run upload -- --file ~/Downloads/app.apk
//    node scripts/upload-to-browserstack.js --file app.ipa --env-out /tmp/bs.env
//
//  Needs BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY in the environment
//  (or your .env). Prints the bs:// URL; with --env-out it also appends
//  BS_APP_URL=bs://... to that file. BrowserStack keeps uploads ~30 days.
// ============================================================================

const fs = require("fs");
const path = require("path");

// Reuse the .env loader so `npm run upload` works with local creds.
require("../core/config");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") args.file = argv[++i];
    else if (argv[i] === "--env-out") args.envOut = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.file) throw new Error("Usage: upload-to-browserstack.js --file <binary> [--env-out <file>]");
  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

async function main() {
  const { file, envOut } = parseArgs(process.argv.slice(2));
  const username = requireEnv("BROWSERSTACK_USERNAME");
  const accessKey = requireEnv("BROWSERSTACK_ACCESS_KEY");

  if (!fs.existsSync(file)) throw new Error(`Binary not found: ${file}`);
  const sizeMb = (fs.statSync(file).size / 1024 / 1024).toFixed(1);
  console.log(`Uploading ${file} (${sizeMb} MB) to BrowserStack App Automate...`);

  const form = new FormData();
  form.append("file", await fs.openAsBlob(file), path.basename(file));

  const res = await fetch("https://api-cloud.browserstack.com/app-automate/upload", {
    method: "POST",
    headers: { authorization: "Basic " + Buffer.from(`${username}:${accessKey}`).toString("base64") },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`BrowserStack upload failed: ${res.status} ${text}`);

  let appUrl;
  try { appUrl = JSON.parse(text).app_url; } catch { throw new Error(`Non-JSON response: ${text}`); }
  if (!appUrl || !appUrl.startsWith("bs://")) throw new Error(`No bs:// app_url in response: ${text}`);

  console.log(`\n✅ Uploaded. Paste this into the pipeline's BS_APP_URL field:\n   ${appUrl}\n`);

  if (envOut) {
    fs.mkdirSync(path.dirname(envOut), { recursive: true });
    fs.appendFileSync(envOut, `BS_APP_URL=${appUrl}\n`);
    console.log(`BS_APP_URL appended to ${envOut}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
