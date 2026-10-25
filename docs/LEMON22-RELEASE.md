# Lemon 2.2 candidate

The user chose to retain candidate status because no clean Windows test machine is available. Do not mark this as a stable or fully verified release.

## Build and package

Build prerequisites are needed only on the release machine: .NET 8 SDK, Visual Studio MSBuild with WinUI/C++/Windows SDK components, and Inno Setup 6. The installed app contains the .NET and Windows App SDK runtime files.

```powershell
dotnet run --project native/Lemon2.Checks -c Release
./scripts/build-installer.ps1 -Compiler ./work/tools/inno/ISCC.exe
node scripts/package-release.mjs native/artifacts/2.2.0/Lemon-2.2.0-Setup.exe
node scripts/verify-release.mjs
node scripts/restore-release-assets.mjs
npm run deploy
node scripts/verify-public-download.mjs
```

The GitHub Actions `Windows installer candidate` workflow reproduces the build and uploads an installer artifact. That workflow has not been executed in this task. The compiler download is version/hash pinned and its Authenticode signature is checked. The product installer is unsigned; no signing certificate or trusted signing service is configured.

On a fresh checkout, restore retained release segments from the existing HTTPS deployment with `restore-release-assets.mjs` before deploying; the script verifies complete release hashes. Binary segments are generated artifacts, not Git source files. The archived 2.1 manifest keeps the old ZIP URL working.

Inno Setup performs a per-user installation into `%LOCALAPPDATA%\Programs\Lemon`, registers an uninstaller and Start menu shortcut, and offers an unchecked optional desktop shortcut. Windows 10 build 17763 or later, x64, is required. User settings, registry cache and history remain in `%LOCALAPPDATA%\Lemon2`; uninstall does not delete them. No API key, local backend process, terminal or development tools are required by the installed application.

`MainWindow.xbf`, `DesignSystem.xbf`, `Lemon2.pri` and runtime files are explicitly checked before packaging. The publish target retains native XAML/PRI resources; distributing only the EXE would not work.

## Current verification

- Native Release build and self-contained publish succeeded.
- 43 core checks and 11 Node tests passed; production website build and TypeScript passed.
- Unattended host installation, Start menu shortcut launch, optional desktop shortcut, uninstall registration and data-preserving uninstall were exercised. The interactive wizard walkthrough remains unverified. Exact tested installer hash is recorded in `performance/2.2-install-host.json`.
- Live EN/DE/PL UI changes, native release notes, F11 enter/exit, maximized/restored and narrow layouts at 125% scale, bottom-composer model and effort selection were exercised. Markdown code/table rendering and live light/dark codeblock themes were verified in the installed package.
- An installed-app Canvas request returned a Canvas-only answer. Its slider was changed from 2 to 5 and the calculated result changed from 4 to 10. The persisted assistant message retained an empty text body, nonempty Canvas JSON and slider state 5.
- The canonical `CHANGELOG.md` is embedded into the native core assembly and generated into the website's JSON at build time. Release notes work offline in the app. Dates are attributed to actual repository evidence; unknown beta versions are not fabricated.
- New Cloudflare model probes and limits are documented in `LEMON22-MODELS.md`.

## Remaining gates and limitations

- **Clean Windows install/start/uninstall without preinstalled development runtimes has not been tested.** This is the reason the release remains a candidate.
- A full display scaling matrix, hardware input latency, frame-time scrolling trace, controlled cold-cache startup and statistically repeated inference benchmarks remain unverified. The performance report distinguishes measured proxy workloads from those gaps.
- Installation over a separately released prior installer cannot be claimed: 2.1 was a portable preview. Its existing user data was preserved by this candidate's host tests.
- Web search and file tools did not exist in the 2.1 baseline. No placeholder tool execution, autonomous agent or MCP system was added.

## Clean-machine acceptance checklist

On a fresh supported Windows VM without .NET/Windows App SDK development installations: run the downloaded installer, launch from Start, send a chat with default settings, switch tier/effort, test Canvas, language changes and F11, restart and verify history, then uninstall and check user-data retention. Record Windows build, display scale, installer SHA-256 and results. Only then may `cleanWindowsVerified` become true. Signing status must reflect an actual verified product signature.

Final candidate: `Lemon-2.2.0-Setup.exe`, 59,640,340 bytes, SHA-256 `c449302b28bd771be7a2f5f405c009381a02255cf0327dd175dcfc3397fc0972`. Public full-download verification passed. Worker version `31b614fd-4224-4aab-b6c2-81f6239cfbd0`.
