#!/usr/bin/env node
// Downloads a mobile build from Firebase App Distribution.
//
// Usage:
//   node ci/fetch-firebase-release.js --platform android|ios [--version <displayVersion|buildVersion>]
//
// With no --version (or an empty one) the newest release is used.
//
// Required env:
//   FIREBASE_SERVICE_ACCOUNT_B64   base64-encoded Google service account JSON key
//                                  (role: Firebase App Distribution Viewer)
//   FIREBASE_PROJECT_NUMBER        Firebase console -> Project settings
//   FIREBASE_ANDROID_APP_ID        e.g. 1:1234567890:android:abcdef  (android only)
//   FIREBASE_IOS_APP_ID            e.g. 1:1234567890:ios:abcdef      (ios only)
//
// Outputs:
//   app-binary/app-<platform>.<apk|ipa>   the downloaded binary
//   app-meta/<platform>.env               shell-sourceable metadata for later steps
//   app-meta/<platform>.json              same metadata for ci/report.js

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Readable } = require("stream");

const MAX_PAGES = 4;
const PAGE_SIZE = 50;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--platform") args.platform = argv[++i];
    else if (argv[i] === "--version") args.version = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!["android", "ios"].includes(args.platform)) {
    throw new Error('Pass --platform android or --platform ios');
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

function loadServiceAccount() {
  const raw = Buffer.from(requireEnv("FIREBASE_SERVICE_ACCOUNT_B64"), "base64").toString("utf8");
  let sa;
  try {
    sa = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 did not decode to valid JSON — re-encode the key file with: base64 -i service-account.json | tr -d '\\n'");
  }
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service account JSON is missing client_email/private_key — is this a Google service account key file?");
  }
  return sa;
}

async function mintAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const input = enc({ alg: "RS256", typ: "JWT" }) + "." + enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const signature = crypto.createSign("RSA-SHA256").update(input).sign(sa.private_key, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${input}.${signature}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google OAuth token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).access_token;
}

async function findRelease({ token, projectNumber, appId, version }) {
  const seenVersions = [];
  let pageToken = "";

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(
      `https://firebaseappdistribution.googleapis.com/v1/projects/${projectNumber}/apps/${appId}/releases`,
    );
    url.searchParams.set("pageSize", String(PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Firebase releases.list failed: ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    const releases = body.releases || [];

    if (page === 0 && releases.length === 0) {
      throw new Error("Firebase returned no releases for this app — check the app ID and that builds are being distributed.");
    }

    if (!version) {
      return releases[0]; // list is createTime DESC — first is newest
    }

    for (const release of releases) {
      if (release.displayVersion === version || release.buildVersion === version) {
        return release;
      }
      seenVersions.push(`${release.displayVersion} (${release.buildVersion})`);
    }

    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }

  throw new Error(
    `No release matched version "${version}". Versions seen (newest first):\n  ${seenVersions.join("\n  ")}`,
  );
}

async function downloadBinary(release, destPath) {
  if (!release.binaryDownloadUri) {
    throw new Error(`Release ${release.name} has no binaryDownloadUri.`);
  }
  const res = await fetch(release.binaryDownloadUri);
  if (!res.ok || !res.body) {
    throw new Error(`Binary download failed: ${res.status}`);
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destPath));

  const { size } = fs.statSync(destPath);
  if (size === 0) {
    throw new Error("Downloaded binary is empty.");
  }
  return size;
}

async function main() {
  const { platform, version } = parseArgs(process.argv.slice(2));
  const projectNumber = requireEnv("FIREBASE_PROJECT_NUMBER");
  const appId = requireEnv(platform === "android" ? "FIREBASE_ANDROID_APP_ID" : "FIREBASE_IOS_APP_ID");

  const token = await mintAccessToken(loadServiceAccount());

  console.log(version
    ? `Looking for ${platform} release matching version "${version}"...`
    : `Fetching latest ${platform} release...`);
  const release = await findRelease({ token, projectNumber, appId, version: version || "" });
  console.log(`Selected: ${release.displayVersion} (${release.buildVersion}), created ${release.createTime}`);

  const binaryPath = path.join("app-binary", `app-${platform}.${platform === "android" ? "apk" : "ipa"}`);
  const size = await downloadBinary(release, binaryPath);
  console.log(`Downloaded ${binaryPath} (${(size / 1024 / 1024).toFixed(1)} MB)`);

  const meta = {
    platform,
    displayVersion: release.displayVersion,
    buildVersion: release.buildVersion,
    createTime: release.createTime,
    firebaseConsoleUri: release.firebaseConsoleUri || null,
    binaryPath,
  };
  fs.mkdirSync("app-meta", { recursive: true });
  fs.writeFileSync(path.join("app-meta", `${platform}.json`), JSON.stringify(meta, null, 2));
  fs.writeFileSync(
    path.join("app-meta", `${platform}.env`),
    [
      `APP_DISPLAY_VERSION=${release.displayVersion}`,
      `APP_BUILD_VERSION=${release.buildVersion}`,
      `APP_CREATE_TIME=${release.createTime}`,
      `APP_BINARY_PATH=${binaryPath}`,
      "",
    ].join("\n"),
  );
  console.log(`Wrote app-meta/${platform}.env and app-meta/${platform}.json`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
