# Optional local app source

Use this location inside your downloaded copy of the template — the folder you
unzipped. Do not add app source to a shared checkout of the starter itself.

Place approved app source here only when the project's rules allow it. One or
both platforms can be present:

```
app-under-test/
├── ios/       ← your iOS app source (Xcode project / Swift)
└── android/   ← your Android app source (Gradle project / Kotlin/Java)
```

This folder is ignored by Git except for this README. That reduces accidental
commits; it is not a security boundary.

## What to inspect

| What | Where it lives in the source |
|---|---|
| iOS bundle id → `ios/.env` | `PRODUCT_BUNDLE_IDENTIFIER` in `project.pbxproj`, or `Info.plist` |
| Android package/activity → `android/.env` | `applicationId` in `app/build.gradle`; launcher in `AndroidManifest.xml` |
| iOS accessibility ids (`~id` selectors) | `.accessibilityIdentifier(...)` in SwiftUI / `accessibilityIdentifier =` in UIKit |
| Android accessibility ids (`~id`) | `contentDescription` |
| Android Compose tags | `testTag`; use `#id` only when `testTagsAsResourceId` is enabled and proven in the hierarchy |
| Android resource ids (`#id`) | `android:id="@+id/..."` in `res/layout/*.xml` |
| Screen navigation | `NavigationStack`/`NavHost`, storyboards, nav graphs |

Choose the approved route:

- In the [manual workflow](../MANUAL-WORKFLOW.md), a person searches the source,
  proves runtime behaviour on a build, fills `app-map/APP-MAP.md`, and writes the
  section files by hand.
- In the [Claude-guided workflow](../AI-GUIDED-WORKFLOW.md), Claude reads only
  the approved local paths, fills the same app map and worksheet, then writes
  and validates the section files.

Nothing here is required to run tests. If source cannot be used, map the app
from an approved installed build with local Appium/accessibility inspection.
Never let either route guess a selector that has not been proven.
