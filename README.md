# Lemon AI 2.1

Lemon is a native C#/WinUI 3 Windows AI application. The Next.js site is now the product/download website; Cloudflare Workers AI and the existing v1/v2 API routes remain in the same Worker.

## Windows app

Download the complete Windows x64 preview ZIP from the product website, extract every file, and launch `Lemon2.exe`. The release contains .NET and Windows App SDK runtime files. It connects automatically to `https://lemonai.wik-speck.workers.dev/`; no local server, API key or manual address is needed. The preview archive is not digitally signed.

Native source: `native/Lemon2`; provider, persistence and safe Canvas parsing: `native/Lemon2.Core`. For development only, a Debug build accepts `LEMON_API_BASE_URL` with HTTPS or loopback HTTP. Release builds always use the production origin. Conversation storage remains local in `%LOCALAPPDATA%/Lemon2/history.json`; no cross-device sync or browser-history import is claimed.

## Product site and backend

- `/`: product page and real native screenshot.
- `/changelog`: canonical `CHANGELOG.md`, embedded at build time by `scripts/prepare-content.mjs`.
- `/downloads/Lemon-2.1-win-x64.zip`: streamed, real published Windows release archive.
- `/downloads/release.json`: version, byte size and SHA-256.
- `/api/health`: backend binding readiness.
- `/api/v2/models`, `/api/v2/chat`: current desktop contract.
- `/api/chat` and study API routes remain compatible; existing browser data is not deleted.

```powershell
npm ci
npm run lint
npm run build
npm run preview
```

AI bindings use the authenticated Cloudflare account even in local preview; account quota/pricing applies. Privileged credentials stay server-side. No paid external provider was added. Tier mappings are configurable profiles, not independent benchmark guarantees. Effort changes application instructions and output budgets; it does not impersonate native reasoning controls.

## Prepare and publish the Windows package

Use Visual Studio Developer PowerShell with MSVC, Windows SDK and .NET 8:

```powershell
MSBuild.exe native/Lemon2/Lemon2.csproj /restore /t:Publish /p:Configuration=Release /p:Platform=x64 /p:SelfContained=true /p:PublishDir=C:/absolute/release/folder/
# ZIP the entire publish folder, including .xbf, .pri and all runtime files.
node scripts/package-release.mjs C:/absolute/Lemon-2.1-win-x64.zip
node scripts/verify-release.mjs
npm run deploy
```

The project explicitly copies its compiled XAML and PRI resource index into the publish directory. Launch a copied publish folder before distributing it. Static download segments are generated and Git-ignored; regenerate them before a fresh deployment. Deployment preflight rejects a manifest with missing or mismatched parts. Never rebuild OpenNext while its preview is holding `.open-next` files open on Windows.

## Verification

```powershell
dotnet run --project native/Lemon2.Checks
node --experimental-strip-types --test tests/lemon2.test.mjs tests/canvas-response.test.mjs
npx tsc --noEmit
npx wrangler deploy --dry-run
```

See `docs/LEMON21-AUDIT.md` and `CHANGELOG.md` for evidence, limits and historical milestones. The native renderer supports basic Markdown, tables, code blocks, safe links, common readable math notation and the existing safe Canvas subset. It is not a full TeX engine. Web search and local file tools are deferred behind this core release.
