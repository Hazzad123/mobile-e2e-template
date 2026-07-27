// ============================================================================
//  core/section-registry.js  —  turns automation.config.js `sections` into
//  registered Mocha tests, in order, filtered by TEST_SECTIONS.
// ============================================================================
//  Each section entry points at a spec file that exports a function:
//      module.exports = function register(ctx, { pages, helpers, deps }) { ... }
//  We only load the specs that should run — so a skipped section never even
//  appears in Mocha's output. alwaysRun sections (e.g. auth) always load first.
// ============================================================================

const path = require("path");
const { config, shouldRunSection } = require("./config");

function registerSections(ctx, api) {
  const chosen = config.sections.filter((section) => shouldRunSection(section.key));

  if (chosen.length === 0) {
    console.log("[SECTION] Nothing selected. Check TEST_SECTIONS and the `sections` list in automation.config.js.");
    return;
  }

  for (const section of chosen) {
    const specPath = path.join(__dirname, "..", section.spec);
    let register;
    try {
      register = require(specPath);
    } catch (error) {
      throw new Error(`Could not load spec for section "${section.key}" (${section.spec}): ${error.message}`);
    }
    if (typeof register !== "function") {
      throw new Error(`Spec "${section.spec}" must export a function, got ${typeof register}.`);
    }
    console.log(`[SECTION] ${section.key}${section.alwaysRun ? " (always-run)" : ""} -> ${section.spec}`);
    register(ctx, api);
  }
}

module.exports = { registerSections };
