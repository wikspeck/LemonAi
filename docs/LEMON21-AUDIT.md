# Lemon 2.1 audit

Verified 2026-10-25 against clean main at 6419d3d. Git has one local/default branch, no tags and no GitHub releases (GitHub releases API returned an empty collection). Canonical CHANGELOG.md distinguishes commits from releases and leaves early beta/1.x numbers unverified.

Core findings: manual backend URL; no startup connection; generic Canvas parse errors discard readable output; fallback strings bypass native Canvas detection; embedded Canvas JSON in assistant prose is an observed case; the old native detector recognized only a JSON document at the start. Native UI put several full-width selectors above the conversation, and history was in an unconstrained StackPanel. Static website still opened browser chat.

Corrections: built-in HTTPS production endpoint; Debug-only loopback override; automatic registry initialization with two bounded GET attempts, 12-second per-attempt timeout and explicit offline retry; no automatic repeated generation calls. Canvas normalizer accepts object/fence/envelope/prose wrappers, validates strictly, allows at most one bounded same-model repair and preserves original diagnostic content internally. Native restore also migrates internal Canvas documents. No arbitrary code or XAML is evaluated.

UI direction: compact selectors, readable central conversation, restrained native surfaces, bottom settings, responsive sidebar and an uncluttered composer. Reference principles were checked against official ChatGPT release notes, Claude artifact documentation and Microsoft Copilot navigation guidance; no proprietary assets were used.

https://help.openai.com/en/articles/6825453-chatgpt-release-notes
https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them
https://support.microsoft.com/en-us/microsoft-365-copilot/what-is-microsoft-copilot-app
https://developers.cloudflare.com/workers-ai/features/json-mode/

Release packaging found a real startup regression: dotnet/MSBuild Publish omitted loose XBF files and the application's PRI resource index. Compiling succeeded but launching failed. PublishNativeXaml now copies both into the package; a copied, runtime-complete Windows build subsequently opened a window and connected to production without entering an address.

Web search and local file tools remain deferred, as explicitly secondary to core stability in the specification. No paid provider was introduced. Native mathematical notation is a readable subset, not a full TeX typesetter. This release is an unsigned preview archive rather than a signed installer.
