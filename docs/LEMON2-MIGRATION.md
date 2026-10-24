# Lemon 2 migration — 2026-10-24

## Baseline and audit
Repository: C:/Users/wiksp/Documents/GitHub/lemonai. HEAD d4fcca6. Existing uncommitted user edits were present in README, chat route/UI/styles, learn redirect, package files and two untracked chat components. Do not reset, overwrite or commit those changes implicitly.

Next.js 16.3.4 App Router, React 19.2.8, TypeScript, Zod 4.5.4. OpenNext 1.20.6 packages the application as Worker lemonai with AI/ASSETS/IMAGES/self-reference bindings. Compatibility date 2026-09-03. No D1, KV or authentication configured. Public chat API checks Origin when supplied; this is not authentication or quota protection.

/api/chat GET reports binding availability; POST validates two exact Llama IDs, bounds body to 1 MB and streams Workers AI SSE with 4096 output tokens. Client handles response and OpenAI-style delta events, cancellation and interrupted text. Chat history is browser-local lemon.chats.v1; theme lemon.theme. Study data uses separate versioned local storage, with v1 migration. Hidden study routes remain reusable, not obsolete code to delete.

Reusable: existing AI binding, deployment path, request limits, SSE contract, Markdown semantics, structured-output validation patterns. Native rendering must be implemented independently; React components cannot be used as native views. Existing structured study generator permits one repair call; Lemon 2 should avoid adding automatic multi-model calls.

## Ordered migration and acceptance gates
1. Preserve all existing files; add native/ alongside web app. No replacement or removal of Lemon 1. Baseline Git HEAD plus working edits remain intact.
2. Establish C#/WinUI 3/XAML solution, native shell, async HTTP service, cancellation and local persistence. First connect to unchanged /api/chat, using an explicitly configured existing Worker URL. Gate: MSBuild and actual launch.
3. Add versioned /api/v2/models and /api/v2/chat without changing v1. Registry owns exact IDs, capabilities, documentation links, verification status and tier mappings. Gate: registry/request tests and Worker packaging.
4. Add separate tier, effort and output selectors. Effort uses bounded output budgets and instruction detail unless native reasoning controls are documented. Fallback requires explicit metadata and visible status. Do not advertise Apex as objectively strongest without task evaluations.
5. Add versioned strict Canvas schema, bounded depth/count/string sizes, allowlisted properties, safe typed expression operators and state bindings. Buffer structured output until validation succeeds. Native component registry initially text, headings, cards, stack, checkbox, slider and arithmetic result. Gate: invalid-output, state and interaction tests.
6. Complete native Markdown, conversation search/rename/delete/regeneration, themes, focus/accessibility, virtualization and recoverable versioned persistence. Preserve Canvas/configuration with history. Gate: UI checks at different DPI/window sizes/themes and persistence/cancellation tests.
7. Only after these gates: full build, Worker dry-run, authenticated model inference checks, native UI verification and documented release. No production deployment or billing changes performed by this migration stage.

## Model verification findings
Official Cloudflare documentation on 2026-10-24 confirms @cf/qwen/qwen3-30b-a3b-fp8 (32768 context, streaming, response_format, $0.0509/M input and $0.335/M output) and a DeepSeek R1 Distill Qwen 32B model page. Account-specific availability, licensing and inference remain to be verified before enabling additions. Reasoning capability does not prove a supported reasoning_effort parameter.
The guessed older model slugs llama-3.1-8b-instruct-fast, mistral-7b-instruct-v0.2 and gemma-3-12b-it redirect to unavailable pages. Do not enable them. Discover exact available variants through the catalogue. Existing Llama IDs remain the only client choices in this first increment.
Sources: https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/ ; https://developers.cloudflare.com/workers-ai/models/deepseek-r1-distill-qwen-32b/ ; https://developers.cloudflare.com/workers-ai/models/

## Security and storage
No Cloudflare credentials in desktop client. Backend URL must be HTTPS (HTTP allowed only for loopback development). No generated XAML/code execution. Native history is local only, separate from browser history; no automatic import or sync claim. Atomic writes must precede updating visible conversation history on disk. Corrupt/unknown-version history must not be silently overwritten.

## Implementation increment (2026-10-24)
The first native and API increment has now been added under native/, lib/lemon2/ and app/api/v2/. The original Lemon 1 source files were not modified by this task. Native build prerequisites were initially missing; with explicit user approval, the existing Visual Studio installation was extended using Microsoft.VisualStudio.Component.VC.Tools.x86.x64 and Microsoft.VisualStudio.Component.Windows11SDK.26100. Installer exit code 0. The Windows App SDK restore and native XAML build subsequently succeeded.

Live short-response probes through the local Worker and actual remote AI binding returned valid final responses for Qwen3, Llama 4 Scout, Gemma 4, Llama 3.3 and Mistral Small. DeepSeek returned raw thinking and is explicitly disabled pending a safe output parser/adequate generation policy. Default mappings are Vortex=Qwen3, Zenith=Scout, Apex=Gemma4; they are distinct profiles, not proven performance rankings. Output is schema-constrained for Scout Canvas via guided_json and requests JSON-object mode for other models; strict post-validation remains mandatory. The first prompt-only Canvas test correctly fell back to text and motivated that correction.

Official catalogue verification also found @cf/mistralai/mistral-small-3.1-24b-instruct (128000 context) and @cf/google/gemma-4-26b-a4b-it (256000 context), rather than the unavailable guessed variants. All exact API identifiers are centralized in lib/lemon2/contracts.ts for the v2 API. The client discovers them over HTTP. Licensing sources: https://huggingface.co/Qwen/Qwen3-30B-A3B ; https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503 ; https://ai.google.dev/gemma/apache_2 ; https://github.com/deepseek-ai/DeepSeek-R1/blob/main/LICENSE . Existing Llama license restrictions remain applicable.

See native/README.md for exact verification commands and the remaining specification gaps. No phase beyond the verified scope should be reported complete.
