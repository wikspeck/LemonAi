# Lume Notebooks migration

Reuse Next.js 16, React 19, OpenNext, the existing Cloudflare AI binding, Geist typography, lime/paper palette, and Markdown renderer. Keep `/api/chat`, `/api/v2/*`, Windows artifacts and existing browser chat keys intact. The previous product landing page is retained at `/legacy`.

Implementation order: typed local entities and conflict-safe IndexedDB; responsive notebook workspace and Markdown editor; bounded grounded AI endpoint; local document extraction; offline shell and install flow; separate Kotlin/Compose + Room client; release verification.

Notes stay on this device. Only the retrieved excerpts explicitly submitted to AI leave it. No public note endpoint exists. Cloud accounts/sync are deliberately unavailable until an authenticated service and per-user authorization are provisioned. Backup import adds copies and never replaces local data. Concurrent note writes preserve a conflict copy. No billing or provider account changes are part of this migration.

Android release gate: build with an owner-held release keystore, run instrumented tests on a device, verify APK signature and checksum, upload to the existing HTTPS host, then publish verified version/bytes/hash/URL metadata. Never ship a debug-signed APK as a release. Build the AAB from the same signing configuration. See `native/LumeNotebooks/README.md`.

## Verification

- 16 Node regression checks cover the retained Lemon contracts and new retrieval, routing, reasoning filtering, conflict preservation, and backup reference remapping.
- Production Next/OpenNext builds and a Wrangler dry run passed. Production dependency audit: zero advisories after the framework/security updates. Fonts are bundled locally.
- Browser UI checks passed notebook creation, rich formatting and Markdown tables, checkbox persistence, actual TXT/PDF/image OCR imports, offline reload and editing, backup export/import including attachments, simultaneous edits from two tabs preserving both versions, a 390px dark mobile layout without horizontal overflow, and recently opened notebooks persisting across reloads in the Workers runtime.
- Two tests passed on a Pixel 9 Android 17 emulator against the release-signed APK, covering Room conflict/revision preservation and native create/edit/reopen/activity-recreation behavior. Software graphics and a cold boot were needed because the emulator's previous system snapshot was unstable. Test-only AndroidX pre-release runners support that emulator; they are excluded from the shipped app.
- APK Signature Scheme v2 verifies with the dedicated 4096-bit release key. The exact tested APK and its segment hashes are checked by the packaging scripts; the same key signs the future Play AAB. Private signing material stays outside Git and public assets.

Live verification passed on `https://lemonai.wik-speck.workers.dev`: notebook homepage, manifest, offline assets, retained API routes, origin/schema protection, and the complete 60,126,002-byte APK download. Its SHA-256 matched the tested release and the downloaded file's release certificate verified. Live Llama summarization and DeepSeek cited notebook chat passed. Browser AI checks also passed review-before-insertion, preservation of the original note, real flashcard generation/flipping, and real quiz generation/feedback, and confirmed selected-text rewriting that preserved the surrounding text.

The initial public runtime check found that OpenNext 1.20.6 could not inline Next 16.4's new `preview-props.json`. Updating to OpenNext 1.20.16 and Wrangler 4.158.0 fixed it; HTTP 200 was verified in workerd before the repaired deployment. Production dependency audit remains clear. Emulator testing does not substitute for physical-device compatibility testing across Android versions.
