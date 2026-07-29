const fs = require("fs");
const path = require("path");

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS = {
  passed: 1,
  blocked: 2,
  failed: 5,
};

function loadEnvFile(filePath = path.join(__dirname, "..", ".env")) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    process.env[key] ||= value;
  }
}

loadEnvFile();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("__")) {
    throw new Error(`Missing ${name}. TestRail publishing is required for this CI run.`);
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name];
  return value && !value.includes("__") ? value : undefined;
}

function parseMonth(value = process.env.TESTRAIL_PLAN_MONTH) {
  if (value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) {
      throw new Error(`Invalid TESTRAIL_PLAN_MONTH "${value}". Expected YYYY-MM.`);
    }
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      throw new Error(`Invalid TESTRAIL_PLAN_MONTH "${value}". Month must be 01-12.`);
    }
    return { year, monthIndex };
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year").value),
    monthIndex: Number(parts.find((part) => part.type === "month").value) - 1,
  };
}

function buildMonthlyPlanInfo(value) {
  const { year, monthIndex } = parseMonth(value);
  const monthName = MONTH_NAMES[monthIndex];
  const start = Date.UTC(year, monthIndex, 1, 0, 0, 0);
  const due = Date.UTC(year, monthIndex + 1, 0, 23, 59, 59);

  return {
    name: `${optionalEnv("TESTRAIL_PLAN_PREFIX") || "Mobile E2E"} ${monthName} ${year}`,
    containsToken: `${monthName} ${year}`,
    startOn: Math.floor(start / 1000),
    dueOn: Math.floor(due / 1000),
  };
}

function targetRunName(target) {
  return `iOS ${target.osVersion} - ${target.device}`;
}

function normalizeConfigText(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function majorOsVersion(osVersion) {
  return String(osVersion).split(".")[0];
}

function elapsedFromMs(durationMs = 0) {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function extractCaseIds(title) {
  return [...title.matchAll(/\bC(\d+)\b/g)].map((m) => Number(m[1]));
}

function assertPublishableTitle(title) {
  if (/\bLOCAL-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/i.test(String(title))) {
    throw new Error(
      `Local-only case label found in "${title}". `
      + "Replace every LOCAL-* label with a verified C### before TestRail publication.",
    );
  }
}

function extractCaseId(title) {
  const ids = extractCaseIds(title);
  return ids.length > 0 ? ids[0] : null;
}

function mergeStatus(current, next) {
  if (current === STATUS.failed || next === STATUS.failed) {
    return STATUS.failed;
  }
  if (current === STATUS.passed || next === STATUS.passed) {
    return STATUS.passed;
  }
  return STATUS.blocked;
}

function statusForResult(result) {
  if (result.status === "fail") {
    return STATUS.failed;
  }
  if (result.status === "pass") {
    return STATUS.passed;
  }
  return STATUS.blocked;
}

function buildCaseResults(summary, target) {
  const cases = new Map();

  for (const result of summary.results || []) {
    assertPublishableTitle(result.title);
    const caseIds = extractCaseIds(result.title);
    if (caseIds.length === 0) {
      continue;
    }

    const statusId = statusForResult(result);

    for (const caseId of caseIds) {
      const existing = cases.get(caseId) || {
        case_id: caseId,
        status_id: statusId,
        elapsedMs: 0,
        titles: [],
        failures: [],
        skipped: 0,
        passed: 0,
        failed: 0,
      };

      existing.status_id = mergeStatus(existing.status_id, statusId);
      existing.elapsedMs += result.durationMs || 0;
      if (!existing.titles.includes(result.title)) {
        existing.titles.push(result.title);
      }

      if (result.status === "pass") existing.passed++;
      if (result.status === "skip") existing.skipped++;
      if (result.status === "fail") {
        existing.failed++;
        if (result.errorMessage) {
          existing.failures.push(result.errorMessage);
        }
      }

      cases.set(caseId, existing);
    }
  }

  return [...cases.values()]
    .sort((a, b) => a.case_id - b.case_id)
    .map((result) => ({
      case_id: result.case_id,
      status_id: result.status_id,
      elapsed: elapsedFromMs(result.elapsedMs),
      comment: buildResultComment(summary, target, result),
    }));
}

function buildPipelineUrl(summary) {
  if (summary.pipelineUrl) {
    return summary.pipelineUrl;
  }
  if (process.env.BITBUCKET_GIT_HTTP_ORIGIN && process.env.BITBUCKET_BUILD_NUMBER) {
    return `${process.env.BITBUCKET_GIT_HTTP_ORIGIN.replace(/\/+$/, "")}/pipelines/results/${process.env.BITBUCKET_BUILD_NUMBER}`;
  }
  if (process.env.BUILD_URL) {
    return process.env.BUILD_URL;
  }
  return "not available";
}

function buildResultComment(summary, target, result) {
  const lines = [
    `Automated BrowserStack result for ${target.device} / iOS ${target.osVersion}.`,
    `Pipeline: ${buildPipelineUrl(summary)}`,
    `Run totals: ${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.skipped} skipped.`,
    `Summary: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped for this TestRail case.`,
    `Run status: ${summary.status}.`,
  ];

  if (summary.commit) {
    lines.push(`Commit: ${summary.commit}`);
  }
  if (summary.sessionUrl) {
    lines.push(`BrowserStack session: ${summary.sessionUrl}`);
  }
  if (summary.abortReason) {
    lines.push(`Run stopped early: ${summary.abortReason}`);
  }
  if (result.failures.length > 0) {
    lines.push("", "Failures:");
    result.failures.forEach((failure) => lines.push(`- ${failure}`));
  }
  lines.push("", "Automation test titles:");
  result.titles.forEach((title) => lines.push(`- ${title}`));

  return lines.join("\n");
}

class TestRailClient {
  constructor({ baseUrl, username, apiKey }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.auth = Buffer.from(`${username}:${apiKey}`).toString("base64");
  }

  async request(method, endpoint, body) {
    const response = await fetch(`${this.baseUrl}/index.php?/api/v2/${endpoint}`, {
      method,
      headers: {
        "Authorization": `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`TestRail ${method} ${endpoint} failed (${response.status}): ${text}`);
    }

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      throw new Error(`TestRail ${method} ${endpoint} returned invalid JSON: ${error.message}`);
    }

    return data;
  }

  get(endpoint) {
    return this.request("GET", endpoint);
  }

  post(endpoint, body = {}) {
    return this.request("POST", endpoint, body);
  }
}

class TestRailPublisher {
  constructor({ matrix, runName }) {
    this.projectId = Number(requireEnv("TESTRAIL_PROJECT_ID"));
    this.suiteId = optionalEnv("TESTRAIL_SUITE_ID") ? Number(optionalEnv("TESTRAIL_SUITE_ID")) : null;
    this.matrix = matrix;
    this.runName = runName;
    this.planEntry = null;
    this.runIdsByTargetId = new Map();
    this.configIdsByTargetId = new Map();
    this.client = new TestRailClient({
      baseUrl: requireEnv("TESTRAIL_BASE_URL"),
      username: requireEnv("TESTRAIL_USERNAME"),
      apiKey: requireEnv("TESTRAIL_API_KEY"),
    });

    if (!Number.isInteger(this.projectId) || this.projectId <= 0) {
      throw new Error("TESTRAIL_PROJECT_ID must be a positive integer.");
    }
    if (optionalEnv("TESTRAIL_SUITE_ID") && (!Number.isInteger(this.suiteId) || this.suiteId <= 0)) {
      throw new Error("TESTRAIL_SUITE_ID must be a positive integer when set.");
    }
  }

  async ensurePlanEntry(caseIds) {
    const plan = await this.findOrCreateMonthlyPlan();
    const configIdsByTargetId = await this.resolveConfigIds();
    const topLevelConfigIds = [...new Set([...configIdsByTargetId.values()])];
    const runs = this.matrix.map((target) => ({
      name: targetRunName(target),
      description: `Automated BrowserStack E2E run for ${target.device} / iOS ${target.osVersion}.`,
      include_all: false,
      case_ids: caseIds,
      config_ids: [configIdsByTargetId.get(target.id)],
    }));

    const body = {
      name: this.runName,
      include_all: false,
      case_ids: caseIds,
      config_ids: topLevelConfigIds,
      runs,
    };
    if (this.suiteId) {
      body.suite_id = this.suiteId;
    }

    this.planEntry = await this.client.post(`add_plan_entry/${plan.id}`, body);
    const createdRuns = this.planEntry.runs || [];

    for (const target of this.matrix) {
      const runName = targetRunName(target);
      const configId = configIdsByTargetId.get(target.id);
      const run = createdRuns.find((candidate) => candidate.name === runName)
        || createdRuns.find((candidate) => candidate.config === runName)
        || createdRuns.find((candidate) => (candidate.config_ids || []).includes(configId));
      if (!run?.id) {
        throw new Error(`TestRail plan entry did not return a run id for "${runName}".`);
      }
      this.runIdsByTargetId.set(target.id, run.id);
    }

    console.log(`[TESTRAIL] Added plan entry ${this.planEntry.id} to plan ${plan.id}: ${this.runName}`);
  }

  async resolveConfigIds() {
    if (this.configIdsByTargetId.size === this.matrix.length) {
      return this.configIdsByTargetId;
    }

    const configured = optionalEnv("TESTRAIL_CONFIG_IDS");
    if (configured) {
      const ids = configured.split(",").map((value) => Number(value.trim())).filter(Boolean);
      if (ids.length !== this.matrix.length) {
        throw new Error(
          `TESTRAIL_CONFIG_IDS must contain ${this.matrix.length} comma-separated IDs, one for each matrix target.`,
        );
      }
      this.matrix.forEach((target, index) => this.configIdsByTargetId.set(target.id, ids[index]));
      return this.configIdsByTargetId;
    }

    const groupsPage = await this.client.get(`get_configs/${this.projectId}`);
    const groups = Array.isArray(groupsPage) ? groupsPage : (groupsPage.configs || []);
    const iosGroup = groups.find((group) => normalizeConfigText(group.name) === "ios");
    const configs = iosGroup?.configs || [];

    for (const target of this.matrix) {
      const config = findConfigForTarget(configs, target);
      if (!config) {
        throw new Error(
          `No TestRail iOS configuration found for ${target.device} / iOS ${target.osVersion}. ` +
          "Add the configuration in TestRail or set TESTRAIL_CONFIG_IDS in matrix order.",
        );
      }
      this.configIdsByTargetId.set(target.id, config.id);
      console.log(`[TESTRAIL] Using config ${config.id}: ${config.name}`);
    }

    return this.configIdsByTargetId;
  }

  async publishTarget(summary, target) {
    if (!this.planEntry) {
      throw new Error("TestRail plan entry has not been created yet.");
    }

    const runId = this.runIdsByTargetId.get(target.id);
    if (!runId) {
      throw new Error(`No TestRail run id found for ${target.device} / iOS ${target.osVersion}.`);
    }

    const results = buildCaseResults(summary, target);
    if (results.length === 0) {
      throw new Error(`No TestRail case IDs found in ${target.device} / Android ${target.osVersion} results.`);
    }

    await this.client.post(`add_results_for_cases/${runId}`, { results });
    console.log(`[TESTRAIL] Published ${results.length} result(s) to run ${runId}`);
  }

  async findOrCreateMonthlyPlan() {
    const planInfo = buildMonthlyPlanInfo();
    const plans = await this.getAllActivePlans();
    const exactMatches = plans.filter((plan) => plan.name === planInfo.name);
    if (exactMatches.length === 1) {
      const exact = exactMatches[0];
      console.log(`[TESTRAIL] Using existing plan ${exact.id}: ${exact.name}`);
      return exact;
    }
    if (exactMatches.length > 1) {
      throw new Error(
        `Multiple active TestRail plans are named "${planInfo.name}": ` +
        exactMatches.map((plan) => `${plan.id} ${plan.name}`).join(", "),
      );
    }

    const containsMatches = plans.filter((plan) => plan.name.includes(planInfo.containsToken));
    if (containsMatches.length === 1) {
      const plan = containsMatches[0];
      console.log(`[TESTRAIL] Using existing monthly plan ${plan.id}: ${plan.name}`);
      return plan;
    }
    if (containsMatches.length > 1) {
      throw new Error(
        `Multiple active TestRail plans contain "${planInfo.containsToken}": ` +
        containsMatches.map((plan) => `${plan.id} ${plan.name}`).join(", "),
      );
    }

    const body = {
      name: planInfo.name,
      start_on: planInfo.startOn,
      due_on: planInfo.dueOn,
    };
    const plan = await this.client.post(`add_plan/${this.projectId}`, body);
    console.log(`[TESTRAIL] Created monthly plan ${plan.id}: ${plan.name}`);
    return plan;
  }

  async getAllActivePlans() {
    const plans = [];
    let offset = 0;
    const limit = 250;

    while (true) {
      const page = await this.client.get(
        `get_plans/${this.projectId}&is_completed=0&limit=${limit}&offset=${offset}`,
      );
      const entries = Array.isArray(page) ? page : (page.plans || []);
      plans.push(...entries);

      if (Array.isArray(page) || entries.length < limit) {
        break;
      }
      offset += limit;
    }

    return plans;
  }
}

function findConfigForTarget(configs, target) {
  const device = normalizeConfigText(target.device);
  const iosMajor = `ios ${majorOsVersion(target.osVersion)}`;
  const candidates = configs.filter((config) => {
    const name = normalizeConfigText(config.name);
    return name.includes(device) && name.includes(iosMajor);
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((a, b) => b.id - a.id)[0];
}

function buildRequiredCaseIds(summaries) {
  const ids = new Set();
  for (const summary of summaries) {
    for (const result of summary?.results || []) {
      assertPublishableTitle(result.title);
      for (const id of extractCaseIds(result.title)) {
        ids.add(id);
      }
    }
  }
  return [...ids].sort((a, b) => a - b);
}

module.exports = {
  TestRailPublisher,
  buildCaseResults,
  buildMonthlyPlanInfo,
  buildRequiredCaseIds,
  extractCaseId,
  extractCaseIds,
  findConfigForTarget,
  loadEnvFile,
  targetRunName,
};
