// ============================================================================
//  core/timings.js  —  every timing value in one place.
// ============================================================================
//  RULE: never write a raw millisecond number in a test or page object. Use a
//  constant from here. That keeps waits consistent and tunable in one spot.
//
//    TIMEOUT.*  maximum time a polling wait may take before giving up
//    PAUSE.*    a fixed wait AFTER an action (let the UI settle)
//    ACTION.*   gesture durations (how long a press/swipe lasts)
//    POLL.*     the gap between retries inside a polling loop
//    TEST.*     per-test budgets for this.timeout(...)
//
//  All TIMEOUT/PAUSE values are NOMINAL (local-device) numbers. The helpers in
//  core/helpers.js multiply them by config.timeoutMultiplier so BrowserStack
//  runs automatically get more headroom — you don't scale them by hand.
// ============================================================================

module.exports = {
  TIMEOUT: {
    INSTANT: 500,
    QUICK: 2000,
    SHORT: 3000,
    STANDARD: 10000,
    LONG: 15000,
    OPTIONAL: 2000, // how long "is this optional thing here?" waits before moving on
  },
  PAUSE: {
    UI_SETTLE: 500,
    TRANSITION: 750,
    AFTER_DISMISS: 800,
    SAVE: 2000,
  },
  ACTION: {
    IMMEDIATE: 0,
    TAP_PRESS: 20,
    SWIPE: 600,
  },
  POLL: {
    FAST: 250,
    STANDARD: 500,
  },
  TEST: {
    THIRTY_SECONDS: 30000,
    ONE_MINUTE: 60000,
    NINETY_SECONDS: 90000,
    TWO_MINUTES: 120000,
    FIVE_MINUTES: 300000,
  },
};
