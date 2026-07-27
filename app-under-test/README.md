# app-under-test/

**Drop your app's source code here** (clone your app's repo and copy it in). One
or both platforms:

```
app-under-test/
├── ios/       ← your iOS app source (Xcode project / Swift)
└── android/   ← your Android app source (Gradle project / Kotlin/Java)
```

## Why

This is the fastest, most reliable way to build accurate tests. An AI (or you)
reads the source to find:

| What | Where it lives in the source |
|---|---|
| iOS bundle id → `automation.config.js` | `PRODUCT_BUNDLE_IDENTIFIER` in `project.pbxproj`, or `Info.plist` |
| Android package → `automation.config.js` | `applicationId` in `app/build.gradle` |
| iOS accessibility ids (`~id` selectors) | `.accessibilityIdentifier(...)` in SwiftUI / `accessibilityIdentifier =` in UIKit |
| Android accessibility ids (`~id`) | `contentDescription`, Compose `testTag` |
| Android resource ids (`#id`) | `android:id="@+id/..."` in `res/layout/*.xml` |
| Screen navigation | `NavigationStack`/`NavHost`, storyboards, nav graphs |

The AI turns this into `docs/APP-MAP.md`, then into page objects and specs.

## Notes

- **This folder is git-ignored** (except this README) — your app source is never
  committed into the test repo.
- **Nothing here is required to run tests.** If you can't share source, the app
  can be mapped live instead (open it on a device and dump the UI hierarchy —
  see the README's "Finding selectors without source" section).
