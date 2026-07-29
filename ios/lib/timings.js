// Central timing configuration. Keep waits here so cloud-device tuning is easy.
const TIMINGS = Object.freeze({
  ACTION: Object.freeze({
    IMMEDIATE: 0,
    TAP_PRESS: 20,
    KEYSTROKE_PAUSE: 50,
    SHORT_PRESS: 100,
    SWIPE: 400,
  }),
  POLL: Object.freeze({
    FAST: 250,
    STANDARD: 500,
  }),
  PAUSE: Object.freeze({
    AFTER_DISMISS: 300,
    UI_UPDATE: 400,
    UI_SETTLE: 500,
    TRANSITION: 750,
    ONE_SECOND: 1_000,
    SCREEN_TRANSITION: 1_500,
  }),
  TIMEOUT: Object.freeze({
    VERY_SHORT: 500,
    RETRY: 750,
    QUICK: 1_500,
    OPTIONAL: 2_000,
    SHORT: 3_000,
    STANDARD_OPTIONAL: 5_000,
    INPUT: 8_000,
    STANDARD: 10_000,
    LONG: 15_000,
    SCREEN_LOAD: 20_000,
    EXTENDED: 30_000,
  }),
  TEST: Object.freeze({
    ONE_MINUTE: 60_000,
    TWO_MINUTES: 120_000,
    THREE_MINUTES: 180_000,
    FIVE_MINUTES: 300_000,
  }),
  MULTIPLIER: Object.freeze({
    LOCAL: 1,
    BROWSERSTACK: 1.5,
  }),
});

module.exports = TIMINGS;
