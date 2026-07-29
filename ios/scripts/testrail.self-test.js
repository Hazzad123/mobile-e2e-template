#!/usr/bin/env node

const assert = require("assert");
const {
  TestRailPublisher,
  buildCaseResults,
  buildMonthlyPlanInfo,
  buildRequiredCaseIds,
  targetRunName,
} = require("./testrail");
const { DEVICES } = require("../lib/devices");

const matrix = DEVICES;
const fakeTestRailConfigIds = DEVICES.map((_, index) => 3301 + index);

function applyRequiredEnv() {
  process.env.TESTRAIL_BASE_URL = "https://example.testrail.test";
  process.env.TESTRAIL_USERNAME = "automation@example.test";
  process.env.TESTRAIL_API_KEY = "fake-api-key";
  process.env.TESTRAIL_PROJECT_ID = "42";
  process.env.TESTRAIL_PLAN_MONTH = "2026-07";
  process.env.TESTRAIL_PLAN_PREFIX = "Mobile E2E";
  delete process.env.TESTRAIL_SUITE_ID;
}

function makePublisher(plans) {
  applyRequiredEnv();

  const requests = [];
  const publisher = new TestRailPublisher({
    matrix,
    runName: "Automated E2E Build self-test",
  });

  publisher.client = {
    async get(endpoint) {
      requests.push({ method: "GET", endpoint });
      if (endpoint.startsWith("get_configs/")) {
        return [
          {
            id: 333,
            name: "iOS",
            configs: DEVICES.map((target, index) => ({
              id: fakeTestRailConfigIds[index],
              name: `${target.device} - iOS ${target.osVersion.split(".")[0]} (Browserstack)`,
            })),
          },
        ];
      }
      return plans;
    },
    async post(endpoint, body) {
      requests.push({ method: "POST", endpoint, body });
      if (endpoint.startsWith("add_plan/")) {
        return { id: 900, name: body.name };
      }
      if (endpoint.startsWith("add_plan_entry/")) {
        return {
          id: "entry-1",
          runs: body.runs.map((run, index) => ({
            id: 1000 + index,
            name: body.name,
            config_ids: run.config_ids,
          })),
        };
      }
      if (endpoint.startsWith("add_results_for_cases/")) {
        return [];
      }
      throw new Error(`Unexpected fake TestRail endpoint: ${endpoint}`);
    },
  };

  return { publisher, requests };
}

async function assertPlanLookup() {
  const exact = makePublisher([
    { id: 1, name: "Mobile E2E July 2026" },
    { id: 2, name: "Regression July 2026" },
  ]);
  assert.strictEqual((await exact.publisher.findOrCreateMonthlyPlan()).id, 1);
  assert.ok(!exact.requests.some((request) => request.endpoint.startsWith("add_plan/")));

  const contains = makePublisher([
    { id: 3, name: "Monthly E2E July 2026" },
  ]);
  assert.strictEqual((await contains.publisher.findOrCreateMonthlyPlan()).id, 3);

  const created = makePublisher([]);
  assert.strictEqual((await created.publisher.findOrCreateMonthlyPlan()).id, 900);
  const addPlan = created.requests.find((request) => request.endpoint === "add_plan/42");
  const planInfo = buildMonthlyPlanInfo("2026-07");
  assert.deepStrictEqual(addPlan.body, {
    name: "Mobile E2E July 2026",
    start_on: planInfo.startOn,
    due_on: planInfo.dueOn,
  });

  const duplicate = makePublisher([
    { id: 4, name: "Monthly E2E July 2026" },
    { id: 5, name: "Mobile Smoke July 2026" },
  ]);
  await assert.rejects(
    () => duplicate.publisher.findOrCreateMonthlyPlan(),
    /Multiple active TestRail plans contain "July 2026"/,
  );

  const duplicateExact = makePublisher([
    { id: 6, name: "Mobile E2E July 2026" },
    { id: 7, name: "Mobile E2E July 2026" },
  ]);
  await assert.rejects(
    () => duplicateExact.publisher.findOrCreateMonthlyPlan(),
    /Multiple active TestRail plans are named "Mobile E2E July 2026"/,
  );
}

async function assertPlanEntryAndResults() {
  const { publisher, requests } = makePublisher([
    { id: 1, name: "Mobile E2E July 2026" },
  ]);

  const summary = {
    status: "FAILED",
    passed: 1,
    failed: 1,
    skipped: 1,
    results: [
      { title: "C123 Verify happy path", status: "pass", durationMs: 1200 },
      { title: "C123 Verify failure wins", status: "fail", durationMs: 2300, errorMessage: "Expected one result" },
      { title: "C456 Skipped setup", status: "skip", durationMs: 0 },
      { title: "No TestRail case id", status: "pass", durationMs: 300 },
    ],
  };

  const caseIds = buildRequiredCaseIds([summary]);
  assert.deepStrictEqual(caseIds, [123, 456]);

  await publisher.ensurePlanEntry(caseIds);
  const entry = requests.find((request) => request.endpoint === "add_plan_entry/1");
  assert.deepStrictEqual(
    entry.body.runs.map((run) => run.name),
    DEVICES.map(({ device, osVersion }) => `iOS ${osVersion} - ${device}`),
  );
  assert.deepStrictEqual(entry.body.config_ids, fakeTestRailConfigIds);
  assert.deepStrictEqual(
    entry.body.runs.map((run) => run.config_ids),
    fakeTestRailConfigIds.map((id) => [id]),
  );
  assert.ok(entry.body.runs.every((run) => run.include_all === false));
  assert.ok(entry.body.runs.every((run) => JSON.stringify(run.case_ids) === JSON.stringify([123, 456])));

  await publisher.publishTarget(summary, matrix[0]);
  const publish = requests.find((request) => request.endpoint === "add_results_for_cases/1000");
  assert.deepStrictEqual(
    publish.body.results.map((result) => ({ case_id: result.case_id, status_id: result.status_id })),
    [
      { case_id: 123, status_id: 5 },
      { case_id: 456, status_id: 2 },
    ],
  );

  const mapped = buildCaseResults(summary, matrix[0]);
  assert.ok(mapped[0].comment.includes("Expected one result"));
  assert.strictEqual(
    targetRunName(matrix[0]),
    `iOS ${DEVICES[0].osVersion} - ${DEVICES[0].device}`,
  );
}

async function assertMultiCaseIds() {
  const summary = {
    status: "PASSED",
    passed: 1,
    failed: 0,
    skipped: 0,
    results: [
      {
        title: "C101/C202/C303/C404 One automated check maps to multiple cases",
        status: "pass",
        durationMs: 5000,
      },
    ],
  };

  const caseIds = buildRequiredCaseIds([summary]);
  assert.deepStrictEqual(caseIds, [101, 202, 303, 404]);

  const results = buildCaseResults(summary, matrix[0]);
  assert.strictEqual(results.length, 4);
  assert.ok(results.every((r) => r.status_id === 1));

  assert.throws(
    () => buildRequiredCaseIds([{
      results: [{ title: "LOCAL-PROFILE Local-only result" }],
    }]),
    /Replace every LOCAL-\* label with a verified C###/,
  );
}

async function main() {
  await assertPlanLookup();
  await assertPlanEntryAndResults();
  await assertMultiCaseIds();
  console.log("TestRail self-test passed");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
