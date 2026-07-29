# App Map — __APP_NAME__

> The single source of truth for this app's screens, navigation, and selectors.
> Complete it by inspecting approved source or walking the live app, then keep
> it up to date as the app changes. Platform section selectors should agree
> with this file.
>
> Fill this only in a folder whose root `template-state.json` says
> `project-copy`; never adapt the source template.
>
> Delete this note and fill in the sections below. Anything left as
> `__PLACEHOLDER__` or `TODO` is not done yet. Use `not supported` for a
> platform the project deliberately excludes; do not leave an ambiguous blank.
> Find unfinished values with
> `rg -n "__[A-Z0-9_]+__|TODO" app-map/APP-MAP.md`.

## Overview

- **App:** __APP_NAME__
- **Target platform(s):** __ANDROID_IOS_OR_BOTH__
- **Environment and build:** __ENVIRONMENT_AND_BUILD__
- **Last verified:** __DATE__
- **iOS bundle id:** `__IOS_BUNDLE_ID__`
- **Android package:** `__ANDROID_PACKAGE__`
- **Auth / state prerequisites:** _e.g. requires a signed-in account; app creates a
  throwaway account via the `account-setup` section._

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
- **Ready landmark:** _element that proves loading has finished_
- **Key elements:**

| Element | iOS selector | Android selector | Proof / notes |
|---|---|---|---|
| Sign Up button | `~__SIGN_UP_BUTTON__` | `~__SIGN_UP_BUTTON__` | opens sign-up; prove on named build |
| Email field | `~__EMAIL_FIELD__` | `#__EMAIL_FIELD_ID__` | prove with local Inspector |
| Password field | `~__PASSWORD_FIELD__` | `#__PASSWORD_FIELD_ID__` | secure field |

### Screen: __HOME_SCREEN__
- **Purpose:** _landing screen after sign-in_
- **How to reach it:** _complete sign-up / sign-in_
- **Ready landmark:** _stable element that distinguishes Home from a loading screen_
- **Key elements:**

| Element | iOS selector | Android selector | Proof / notes |
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

---

## Filled example — reference only

The values below are fictional and demonstrate the expected level of evidence.
Do not copy these selectors or identifiers into a real project. Delete this
example after the real app map is complete.

### Example overview

- **App:** Example Mobile
- **Target platform(s):** Android and iOS
- **Environment and build:** QA, version 3.8.0 (build 412)
- **Last verified:** 2026-07-29
- **iOS bundle id:** `com.example.mobile`
- **Android package:** `com.example.mobile`
- **Auth / state prerequisites:** signed-in approved QA account; credentials are
  supplied through the platform `.env`, not recorded here.

### Example navigation map

```text
Launch ──▶ Home ──▶ Profile
```

### Example screen: Home

- **Purpose:** starting screen for the Profile check.
- **How to reach it:** launch while signed in.
- **Ready landmark:** the Home heading is visible after loading completes.

| Element | iOS selector | Android selector | Proof / notes |
|---|---|---|---|
| Home heading | `~home-heading` | `~home-heading` | Found after two cold launches with local Appium Inspector on build 412. |
| Profile tab | `~profile-tab` | `#profile_tab` | Inspector search returned only the intended tab after leaving and returning on each platform. |

### Example screen: Profile

- **Purpose:** displays the signed-in user's profile.
- **How to reach it:** select **Profile** from Home.
- **Ready landmark:** heading text is exactly `Profile`.

| Element | iOS selector | Android selector | Proof / notes |
|---|---|---|---|
| Profile heading | `~profile-heading` | `#profile_heading` | Rechecked after leaving and returning to the screen on build 412. |

### Example known quirks

On a clean install, a notification permission dialog may appear before Home.
It is outside the Profile test's scope; the worksheet records that permission
state as a precondition instead of silently dismissing it.

### Example selector quick-reference

| Screen | Element | iOS | Android |
|---|---|---|---|
| Home | Home heading | `~home-heading` | `~home-heading` |
| Home | Profile tab | `~profile-tab` | `#profile_tab` |
| Profile | Profile heading | `~profile-heading` | `#profile_heading` |
