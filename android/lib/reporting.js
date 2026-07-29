const fs = require("fs");
const path = require("path");

function buildRunSummary({
  results,
  abortReason,
  startedAt,
  finishedAt,
  sessionUrl,
  buildUrl,
  config,
}) {
  const passed = results.filter((result) => result.status === "pass").length;
  const failed = results.filter((result) => result.status === "fail").length;
  const skipped = results.filter((result) => result.status === "skip").length;

  return {
    suiteName: config.suiteName,
    platform: config.platform,
    status: failed > 0 || abortReason ? "FAILED" : "PASSED",
    total: results.length,
    passed,
    failed,
    skipped,
    abortReason: abortReason || null,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    appId: config.appId,
    target: config.isBrowserStack
      ? `${config.bsDevice} / ${config.platformLabel} ${config.bsOsVersion}`
      : `Local ${config.platformLabel} (${config.udid})`,
    branch: process.env.BITBUCKET_BRANCH || process.env.GIT_BRANCH || "",
    commit: process.env.BITBUCKET_COMMIT || process.env.GIT_COMMIT || "",
    buildNumber: process.env.BITBUCKET_BUILD_NUMBER || process.env.BUILD_NUMBER || "",
    pipelineUrl: process.env.BITBUCKET_GIT_HTTP_ORIGIN && process.env.BITBUCKET_BUILD_NUMBER
      ? `${process.env.BITBUCKET_GIT_HTTP_ORIGIN}/pipelines/results/${process.env.BITBUCKET_BUILD_NUMBER}`
      : "",
    buildUrl: buildUrl || null,
    sessionUrl: sessionUrl || null,
    results,
  };
}

function formatDuration(durationMs) {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${seconds}s`;
}

function formatConsoleSummary(summary) {
  const lines = [
    "",
    "============================================================",
    "  E2E RESULT SUMMARY",
    "============================================================",
    `  Result: ${summary.status}`,
    `  Target: ${summary.target}`,
    `  App ID: ${summary.appId}`,
    `  Duration: ${formatDuration(summary.durationMs)}`,
    `  Tests: ${summary.total} total, ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`,
  ];

  if (summary.abortReason) lines.push(`  Run stopped early: ${summary.abortReason}`);
  if (summary.sessionUrl) lines.push(`  BrowserStack session: ${summary.sessionUrl}`);

  const failures = summary.results.filter((result) => result.status === "fail");
  lines.push("", failures.length > 0 ? "  What failed:" : "  What failed: Nothing.");
  failures.forEach((failure, index) => {
    lines.push(`  ${index + 1}. ${failure.title}`);
    if (failure.step) lines.push(`     Step: ${failure.step}`);
    if (failure.selector) lines.push(`     Selector: ${failure.selector}`);
    if (failure.errorMessage) lines.push(`     Reason: ${failure.errorMessage.replace(/\s+/g, " ")}`);
    if (failure.videoTs) lines.push(`     Video position: ~${failure.videoTs}`);
    if (failure.artifacts?.screenshot) lines.push(`     Screenshot: ${failure.artifacts.screenshot}`);
    if (failure.artifacts?.source) lines.push(`     Page source: ${failure.artifacts.source}`);
  });

  lines.push("============================================================", "");
  return lines.join("\n");
}

function formatMarkdownSummary(summary) {
  const failures = summary.results.filter((result) => result.status === "fail");
  const lines = [
    `# ${summary.suiteName} result`,
    "",
    `- Result: **${summary.status}**`,
    `- Target: ${summary.target}`,
    `- Duration: ${formatDuration(summary.durationMs)}`,
    `- Tests: ${summary.total} total, ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`,
  ];
  if (summary.pipelineUrl) lines.push(`- Pipeline: ${summary.pipelineUrl}`);
  if (summary.sessionUrl) lines.push(`- BrowserStack session: ${summary.sessionUrl}`);
  if (summary.abortReason) lines.push(`- Stopped early: ${summary.abortReason}`);

  lines.push("", "## Failures", "");
  if (failures.length === 0) {
    lines.push("None.");
  } else {
    failures.forEach((failure) => {
      lines.push(`### ${failure.title}`, "");
      if (failure.step) lines.push(`- Step: ${failure.step}`);
      if (failure.selector) lines.push(`- Selector: \`${failure.selector}\``);
      if (failure.errorMessage) lines.push(`- Reason: ${failure.errorMessage.replace(/\s+/g, " ")}`);
      if (failure.videoTs) lines.push(`- Video position: ~${failure.videoTs}`);
      if (failure.artifacts?.screenshot) lines.push(`- Screenshot: \`${failure.artifacts.screenshot}\``);
      lines.push("");
    });
  }

  lines.push("## Full test list", "");
  for (const result of summary.results) {
    lines.push(`- ${result.status.toUpperCase()}: ${result.title}`);
  }
  return `${lines.join("\n")}\n`;
}

function writeRunSummary(summary, outputDir = path.join(__dirname, "..", "test-results")) {
  fs.mkdirSync(outputDir, { recursive: true });
  const suffix = process.env.SUMMARY_ID ? `-${process.env.SUMMARY_ID}` : "";
  const jsonPath = path.join(outputDir, `summary${suffix}.json`);
  const markdownPath = path.join(outputDir, `summary${suffix}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(markdownPath, formatMarkdownSummary(summary));
  return { jsonPath, markdownPath };
}

module.exports = {
  buildRunSummary,
  formatConsoleSummary,
  formatMarkdownSummary,
  writeRunSummary,
};
