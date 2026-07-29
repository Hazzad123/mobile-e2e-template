#!/usr/bin/env node
// Uploads an app binary to BrowserStack App Automate and records the bs:// URL.
//
// Usage:
//   node ci/upload-to-browserstack.js --file app-binary/app-android.apk --env-out app-meta/android.env
//
// Required env: BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY
// Appends BS_APP_URL=bs://... to the --env-out file (and mirrors it into the
// sibling .json metadata file if one exists).

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") args.file = argv[++i];
    else if (argv[i] === "--env-out") args.envOut = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.file || !args.envOut) {
    throw new Error("Usage: upload-to-browserstack.js --file <binary> --env-out <env file>");
  }
  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function main() {
  const { file, envOut } = parseArgs(process.argv.slice(2));
  const username = requireEnv("BROWSERSTACK_USERNAME");
  const accessKey = requireEnv("BROWSERSTACK_ACCESS_KEY");

  if (!fs.existsSync(file)) {
    throw new Error(`Binary not found: ${file}`);
  }
  const sizeMb = (fs.statSync(file).size / 1024 / 1024).toFixed(1);
  console.log(`Uploading ${file} (${sizeMb} MB) to BrowserStack App Automate...`);

  const form = new FormData();
  form.append("file", await fs.openAsBlob(file), path.basename(file));

  const res = await fetch("https://api-cloud.browserstack.com/app-automate/upload", {
    method: "POST",
    headers: {
      authorization: "Basic " + Buffer.from(`${username}:${accessKey}`).toString("base64"),
    },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`BrowserStack upload failed: ${res.status} ${text}`);
  }

  let appUrl;
  try {
    appUrl = JSON.parse(text).app_url;
  } catch {
    throw new Error(`BrowserStack returned non-JSON response: ${text}`);
  }
  if (!appUrl || !appUrl.startsWith("bs://")) {
    throw new Error(`BrowserStack response had no bs:// app_url: ${text}`);
  }

  fs.mkdirSync(path.dirname(envOut), { recursive: true });
  fs.appendFileSync(envOut, `BS_APP_URL=${appUrl}\n`);
  console.log(`Uploaded. BS_APP_URL=${appUrl} appended to ${envOut}`);

  const jsonPath = envOut.replace(/\.env$/, ".json");
  if (jsonPath !== envOut && fs.existsSync(jsonPath)) {
    const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    meta.bsAppUrl = appUrl;
    fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
