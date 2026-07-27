// Mocha entrypoint. Defines the suite for whichever platform PLATFORM points at
// (set in .env locally, or per step/device in CI). All the real work lives in
// core/runner.js — this file stays a one-liner on purpose.
require("./core/runner").run();
