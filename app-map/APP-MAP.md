# App Map — __APP_NAME__

> The single source of truth for this app's screens, navigation, and selectors.
> Generated from `app-under-test/` (or live inspection) and kept up to date as
> the app changes. Page objects should agree with this file.
>
> Delete this note and fill in the sections below. Anything left as
> `__PLACEHOLDER__` or `TODO` is not done yet — find them with `grep -rn "__\|TODO" app-map/`.

## Overview

- **App:** __APP_NAME__
- **iOS bundle id:** `__IOS_BUNDLE_ID__`
- **Android package:** `__ANDROID_PACKAGE__`
- **Auth / state prerequisites:** _e.g. requires a signed-in account; app creates a
  throwaway account per run via the `auth` section._

## Navigation map

_How a user moves between the main screens. A quick sketch is fine._

```
Launch ──▶ __LANDING_SCREEN__ ──▶ (sign up / sign in) ──▶ __HOME_SCREEN__
                                                            ├──▶ __SCREEN_A__
                                                            └──▶ __SCREEN_B__
```

## Screens

### Screen: __LANDING_SCREEN__
- **Purpose:** _first screen shown on launch_
- **How to reach it:** _cold launch_
- **Key elements:**

| Element | iOS selector | Android selector | Notes |
|---|---|---|---|
| Sign Up button | `~__SIGN_UP_BUTTON__` | `~__SIGN_UP_BUTTON__` | opens sign-up |
| Email field | `~__EMAIL_FIELD__` | `#__EMAIL_FIELD_ID__` | |
| Password field | `~__PASSWORD_FIELD__` | `#__PASSWORD_FIELD_ID__` | secure |

### Screen: __HOME_SCREEN__
- **Purpose:** _landing screen after sign-in_
- **How to reach it:** _complete sign-up / sign-in_
- **Key elements:**

| Element | iOS selector | Android selector | Notes |
|---|---|---|---|
| Home marker | `~__HOME_ELEMENT__` | `~__HOME_ELEMENT__` | proves signed-in |

_(Copy a Screen block per screen you test.)_

## Known quirks

_e.g. a first-run permission dialog, an age gate, a "resume?" prompt — anything a
test must dismiss. Note how to detect and dismiss each._

## Selector quick-reference

| Screen | Element | iOS | Android |
|---|---|---|---|
| __LANDING_SCREEN__ | Sign Up | `~__SIGN_UP_BUTTON__` | `~__SIGN_UP_BUTTON__` |
