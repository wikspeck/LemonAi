# Lemon 2 — native development

The existing Next.js app and `/api/chat` remain Lemon 1. Lemon 2 adds `/api/v2/models`, `/api/v2/chat` and this real C#/WinUI 3/XAML client. There is no browser renderer in the native app.

## Build and run (Windows x64)
Prerequisites: Visual Studio with MSVC x64/x86 tools, Windows 11 SDK 26100, .NET 8 SDK/runtime. Windows App SDK 1.8.260209005 restores through NuGet; its native runtime is copied locally by WindowsAppSDKSelfContained. The .NET runtime remains framework-dependent.

From repository root, in a Visual Studio Developer PowerShell:

```powershell
MSBuild.exe native/Lemon2/Lemon2.csproj /restore /p:Configuration=Debug /p:Platform=x64
# Start the resulting native/Lemon2/bin/x64/Debug/net8.0-windows10.0.19041.0/win-x64/Lemon2.exe

dotnet run --project native/Lemon2.Checks
node --experimental-strip-types --test tests/lemon2.test.mjs
```

The `.sln` groups the UI, independent core and executable checks. Build the UI with Visual Studio MSBuild; a successful core build alone does not validate XAML.

## Connect the existing backend

```powershell
npm run preview
```

Expand Backend-Verbindung and enter the local preview address reported by Wrangler (in this run http://127.0.0.1:8787). Click Verbinden to fetch the authoritative model registry. For a deployed Worker enter its HTTPS origin after deploying the updated API through the existing workflow. Do not enter Cloudflare tokens in the client. HTTP is accepted only for loopback development. No production deployment was performed.

Stop the preview before rebuilding OpenNext on Windows: its file watcher can lock `.open-next` and cause EPERM while the adapter replaces generated output. Never edit the generated bundle to fix application behavior.

## Implemented scope
Native chat shell, per-message streaming text, cancellation/timeout, model discovery, three tier profiles, three independent application effort budgets, plain text, basic native Markdown, buffered validated Canvas, chat search/rename/delete/copy/regenerate, local history/configuration and interactive state persistence. The small Canvas registry supports headings, paragraphs, checkboxes, sliders and add/multiply calculations. Server and native validators reject arbitrary markup/code, unknown properties, unsafe/duplicate state keys, invalid references/ranges and excessive component counts.

History: `%LOCALAPPDATA%/Lemon2/history.json`, version 1, atomic replacement with serialized writers. Unknown/corrupt history is preserved and editing is disabled until recovery. No browser-history import or cross-device sync. A valid Canvas interaction updates local state and schedules persistence. Earlier Lemon 1 browser and study storage remain separate.

## Explicit limitations
This is a first functional migration increment, not completion of all specification phases. Native Markdown covers headings, paragraphs, lists, bold and code; GFM tables, math, links, syntax highlighting and full Markdown parity remain unfinished. Canvas nesting/cards/tabs/tables/charts/forms/simulations and the wider design system are not implemented. Multi-model routing is intentionally absent. Tier mappings are configurable server profiles, not independently benchmarked quality guarantees; Apex is not proven strongest. Effort changes instructions and output token limits, not native reasoning controls. DeepSeek is registered but disabled after a real test returned raw thinking rather than a reliable short final answer. Model availability can change. Failures ask for an explicit retry/model change rather than silently switching tiers.

Endpoint and theme selection are not persisted yet. Conversation settings are saved on sending. Large-chat performance, reduced-motion behavior, IME composition, high-DPI variants and full keyboard/screen-reader coverage need dedicated validation. No installer/signing/production rollout has been made. Buffered provider generation may continue remotely after the client cancels; the client stops waiting and does not freeze. Response persistence during an OS/process kill is not guaranteed before the final write. Quota handling is tested at the client boundary; no real quota exhaustion was induced.
