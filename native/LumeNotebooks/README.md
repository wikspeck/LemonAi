# Lume Notebooks for Android

Native Kotlin / Jetpack Compose app, not a WebView. Reuses the web `/api/notebooks/ai` contract on the existing Cloudflare Worker. Room stores the same versioned JSON entities as the web client; note revisions and conflicting writes are retained. Native navigation, offline Markdown editing, document picker, local PDF extraction, image attachments, incoming/outgoing Android shares, and web-compatible full backup export are implemented.

Cloud accounts and cross-device sync are not enabled. Nothing syncs or uploads automatically. AI transmits only retrieved text when an action is chosen. Images are retained as local attachments; Latin-script image OCR and interactive flashcards/quizzes run locally; scanned PDFs need page-image imports for OCR.

Build with JDK 21, Android SDK 36.1, and the checked-in Gradle wrapper:

```
gradlew.bat :app:assembleDebug :app:connectedDebugAndroidTest
gradlew.bat :app:assembleRelease :app:bundleRelease
```

Set `sdk.dir` in ignored `local.properties` or use `ANDROID_HOME`. The API base URL is a public origin in `app/build.gradle.kts`; no provider credentials belong in this project.

## Signing and release

From the repository root, `node scripts/init-android-signing.mjs` creates a dedicated release identity if none exists. Set `JAVA_HOME` first. The private key and random password remain in ignored `signing/` and `signing.properties`. Back up both securely: future sideloaded updates require the same signing key. Existing identities are never replaced. To use an existing owner key, create `signing.properties` with `storeFile`, `storePassword`, `keyAlias`, `keyPassword` before building.

A release build without those properties is intentionally unsigned. Never publish it. Verify the signed APK with SDK `apksigner verify --verbose --print-certs`, test install/restart/offline editing and shares on a device or emulator, and publish its actual byte size and SHA-256 only after those checks. Build the AAB from the same source and signing configuration for future Play upload; Play account setup is separate.

Uninstalling removes the Android sandbox. Export a backup before uninstalling. Signing material is never copied into public downloads or the APK.
