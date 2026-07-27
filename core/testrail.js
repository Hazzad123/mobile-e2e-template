// ============================================================================
//  core/testrail.js  —  create plans/runs and publish pass/fail, config-driven.
// ============================================================================
//  Everything about HOW plans and runs are named/grouped comes from
//  automation.config.js `testrail` (nothing is hard-coded):
//    planStructure  "periodic" (reuse one plan per month/week) | "per-run"
//    runGrouping    "per-device" (needs TestRail Configurations) | "single"
//    planNamePattern / runNamePattern   {app} {month} {year} {date} {platform} …
//    caseIdPattern  how "C123" ids are read out of test titles
//
//  Case results map to TestRail statuses: pass→1, blocked/skip→2, fail→5.
//  A publish FAILURE is surfaced to the caller (core/matrix.js), which fails the
//  pipeline — TestRail reporting is treated as mandatory once it's configured.
// ============================================================================

const STATUS = { passed: 1, blocked: 2, failed: 5 };

function isTestRailConfigured() {
  return Boolean(process.env.TESTRAIL_BASE_URL && process.env.TESTRAIL_USERNAME && process.env.TESTRAIL_API_KEY);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} — required to publish to TestRail.`);
  return value;
}

function normalize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function extractCaseIds(title, pattern) {
  const re = new RegExp(pattern, "g");
  const ids = [];
  let match;
  while ((match = re.exec(title)) !== null) {
    const digits = (match[1] || match[0]).replace(/\D/g, "");
    if (digits) ids.push(Number(digits));
  }
  return ids;
}

function elapsed(ms) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function mergeStatus(a, b) {
  if (a === STATUS.failed || b === STATUS.failed) return STATUS.failed;
  if (a === STATUS.passed || b === STATUS.passed) return STATUS.passed;
  return STATUS.blocked;
}

function statusFor(result) {
  if (result.status === "fail") return STATUS.failed;
  if (result.status === "pass") return STATUS.passed;
  return STATUS.blocked;
}

// Merge one-or-more device summaries into TestRail case results. Multiple tests
// sharing a case id collapse into one; across devices, any failure wins.
function buildCaseResults(summaries, caseIdPattern) {
  const cases = new Map();
  for (const summary of summaries) {
    for (const result of summary.results || []) {
      const ids = extractCaseIds(result.title, caseIdPattern);
      if (ids.length === 0) continue;
      const status = statusFor(result);
      for (const id of ids) {
        const cur = cases.get(id) || { case_id: id, status_id: status, elapsedMs: 0, notes: [] };
        cur.status_id = mergeStatus(cur.status_id, status);
        cur.elapsedMs += result.durationMs || 0;
        if (result.status === "fail" && result.errorMessage) cur.notes.push(`FAIL: ${result.errorMessage}`);
        cases.set(id, cur);
      }
    }
  }
  return [...cases.values()]
    .sort((a, b) => a.case_id - b.case_id)
    .map((c) => ({
      case_id: c.case_id,
      status_id: c.status_id,
      elapsed: elapsed(c.elapsedMs),
      comment: c.notes.join("\n") || "Automated result.",
    }));
}

function planTokens(config) {
  const tz = config.testrail.timezone && !config.testrail.timezone.includes("__") ? config.testrail.timezone : "UTC";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "long" }).formatToParts(new Date());
  return {
    month: parts.find((p) => p.type === "month").value,
    year: parts.find((p) => p.type === "year").value,
    date: new Date().toISOString().slice(0, 10),
    build: process.env.BITBUCKET_BUILD_NUMBER || "",
  };
}

class TestRailClient {
  constructor() {
    this.baseUrl = requireEnv("TESTRAIL_BASE_URL").replace(/\/+$/, "");
    this.auth = Buffer.from(`${requireEnv("TESTRAIL_USERNAME")}:${requireEnv("TESTRAIL_API_KEY")}`).toString("base64");
  }
  async request(method, endpoint, body) {
    const res = await fetch(`${this.baseUrl}/index.php?/api/v2/${endpoint}`, {
      method,
      headers: { Authorization: `Basic ${this.auth}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`TestRail ${method} ${endpoint} failed (${res.status}): ${text}`);
    return text ? JSON.parse(text) : null;
  }
  get(endpoint) { return this.request("GET", endpoint); }
  post(endpoint, body = {}) { return this.request("POST", endpoint, body); }
}

async function getActivePlans(client, projectId) {
  const plans = [];
  let offset = 0;
  while (true) {
    const page = await client.get(`get_plans/${projectId}&is_completed=0&limit=250&offset=${offset}`);
    const list = Array.isArray(page) ? page : (page.plans || []);
    plans.push(...list);
    if (Array.isArray(page) || list.length < 250) break;
    offset += 250;
  }
  return plans;
}

async function findOrCreatePlan(client, projectId, config, planName) {
  if (config.testrail.planStructure === "periodic") {
    const existing = (await getActivePlans(client, projectId)).filter((p) => p.name === planName);
    if (existing.length === 1) {
      console.log(`[TESTRAIL] Reusing plan ${existing[0].id}: ${planName}`);
      return existing[0];
    }
    if (existing.length > 1) throw new Error(`Multiple active plans named "${planName}" — resolve in TestRail.`);
  }
  const plan = await client.post(`add_plan/${projectId}`, { name: planName });
  console.log(`[TESTRAIL] Created plan ${plan.id}: ${planName}`);
  return plan;
}

async function resolveConfigIds(client, projectId, matrix, platformName) {
  const configured = process.env.TESTRAIL_CONFIG_IDS;
  if (configured) {
    const ids = configured.split(",").map((v) => Number(v.trim())).filter(Boolean);
    if (ids.length !== matrix.length) {
      throw new Error(`TESTRAIL_CONFIG_IDS must list ${matrix.length} ids (one per device, in order).`);
    }
    return new Map(matrix.map((t, i) => [t.id, ids[i]]));
  }
  const groups = await client.get(`get_configs/${projectId}`);
  const arr = Array.isArray(groups) ? groups : (groups.configs || []);
  const group = arr.find((g) => normalize(g.name) === platformName.toLowerCase());
  const configs = group?.configs || [];
  const map = new Map();
  for (const target of matrix) {
    const wantDevice = normalize(target.device);
    const wantOs = `${platformName.toLowerCase()} ${String(target.osVersion).split(".")[0]}`;
    const found = configs
      .filter((c) => normalize(c.name).includes(wantDevice) && normalize(c.name).includes(wantOs))
      .sort((a, b) => b.id - a.id)[0];
    if (!found) {
      throw new Error(`No TestRail Configuration for ${target.device} / ${platformName} ${target.osVersion}. Add it, or set TESTRAIL_CONFIG_IDS in device order.`);
    }
    map.set(target.id, found.id);
  }
  return map;
}

function renderName(config, pattern, extra) {
  return config.render(pattern, extra);
}

async function publishToTestRail(config, entries) {
  if (entries.length === 0) throw new Error("No device summaries to publish.");
  const client = new TestRailClient();
  const projectId = Number(process.env.TESTRAIL_PROJECT_ID || config.testrail.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error("TESTRAIL_PROJECT_ID must be a positive integer (in .env/repo variable or automation.config.js).");
  }
  const suiteId = process.env.TESTRAIL_SUITE_ID ? Number(process.env.TESTRAIL_SUITE_ID) : (config.testrail.suiteId || null);
  const caseIdPattern = config.testrail.caseIdPattern;

  const allCaseIds = [...new Set(entries.flatMap((e) => (e.summary.results || []).flatMap((r) => extractCaseIds(r.title, caseIdPattern))))].sort((a, b) => a - b);
  if (allCaseIds.length === 0) {
    throw new Error(`No TestRail case ids (pattern ${caseIdPattern}) found in any test title.`);
  }

  const tokens = planTokens(config);
  const planName = renderName(config, config.testrail.planNamePattern, tokens);
  const plan = await findOrCreatePlan(client, projectId, config, planName);

  if (config.testrail.runGrouping === "single") {
    // One run holding every device's merged results — no Configurations needed.
    const entryBody = { name: renderName(config, config.testrail.runNamePattern, { ...tokens, device: "all devices", osVersion: "" }).trim(), include_all: false, case_ids: allCaseIds };
    if (suiteId) entryBody.suite_id = suiteId;
    const planEntry = await client.post(`add_plan_entry/${plan.id}`, entryBody);
    const runId = planEntry.runs?.[0]?.id;
    if (!runId) throw new Error("TestRail did not return a run id for the single run.");
    const results = buildCaseResults(entries.map((e) => e.summary), caseIdPattern);
    await client.post(`add_results_for_cases/${runId}`, { results });
    console.log(`[TESTRAIL] Published ${results.length} case result(s) to run ${runId} (single run).`);
    return;
  }

  // per-device: one run per device, tagged with a TestRail Configuration.
  const matrix = entries.map((e) => e.target);
  const configIds = await resolveConfigIds(client, projectId, matrix, config.platformName);
  const runs = matrix.map((target) => ({
    name: renderName(config, config.testrail.runNamePattern, { ...tokens, device: target.device, osVersion: target.osVersion }),
    include_all: false,
    case_ids: allCaseIds,
    config_ids: [configIds.get(target.id)],
  }));
  const entryBody = { name: planName, include_all: false, case_ids: allCaseIds, config_ids: [...new Set(configIds.values())], runs };
  if (suiteId) entryBody.suite_id = suiteId;
  const planEntry = await client.post(`add_plan_entry/${plan.id}`, entryBody);

  for (const entry of entries) {
    const runName = renderName(config, config.testrail.runNamePattern, { ...tokens, device: entry.target.device, osVersion: entry.target.osVersion });
    const run = (planEntry.runs || []).find((r) => r.name === runName)
      || (planEntry.runs || []).find((r) => (r.config_ids || []).includes(configIds.get(entry.target.id)));
    if (!run?.id) throw new Error(`TestRail did not return a run id for "${runName}".`);
    const results = buildCaseResults([entry.summary], caseIdPattern);
    await client.post(`add_results_for_cases/${run.id}`, { results });
    console.log(`[TESTRAIL] Published ${results.length} case result(s) to run ${run.id} (${entry.target.device}).`);
  }
}

module.exports = { isTestRailConfigured, publishToTestRail, buildCaseResults, extractCaseIds };
