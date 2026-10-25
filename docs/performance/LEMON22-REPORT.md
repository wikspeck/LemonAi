# Lemon 2.2 performance evidence

Date: 2026-10-25. Baseline: Git commit `666a434` (Lemon 2.1). Native C#/WinUI 3/XAML is retained; there is no web view or framework migration.

## Architectural findings and changes

- 2.1 awaited a stream read per character. The client now reads bounded 4,096-character blocks and parses complete SSE lines. EOF, cancellation, malformed events and size limits remain checked.
- 2.1 repeatedly cleared and reconstructed long Markdown trees during streaming. 2.2 batches text notifications, appends to the current plain-text paragraph during generation, retains completed paragraphs, and renders rich Markdown once at completion.
- Static message layouts skip identical rebinds. Canvas reuses a validated document and its controls for identical structures, while explicitly rebinding each message's independent slider/checkbox state.
- The visible message collection is stable during generation. New messages are appended, not followed by a full `ItemsSource` reset. Conversation selection still replaces the collection when the selected conversation changes; this operation has not been independently timed.
- History JSON parsing/serialization uses asynchronous/background work and immutable snapshots. Only the selected conversation is normalized for display. Canvas-state saves and search are debounced.
- Model registry results are cached for 30 minutes, scoped to the backend origin. Noncritical AI requests do not block initial window construction. Localized interface bindings are compiled XAML bindings.
- The 2.1 `Content.Length == 0` cleanup incorrectly removed valid Canvas-only replies. Cleanup now checks for Canvas JSON as well.

## Alternating renderer comparison

The original single-run baseline is retained in `2.1-ui-baseline.json`. Later system load changed materially (one sampled CPU reading was 63%), so comparing that early run only with a later run would misrepresent results. The 2.1 controls were rebuilt from Git and run three times, alternating with 2.2 using the same synthetic workload. No user history is loaded by this benchmark.

| Workload | 2.1 median (range) | 2.2 median (range) |
|---|---:|---:|
| 25 identical 11,369-character Markdown rebinds | 3,108 ms (2,502–3,596) | 273 ms (242–353) |
| 40 identical calculator Canvas structures | 290 ms (267–395) | 48 ms (47–68) |
| 30 streaming updates, including 1,650 ms scheduled waits | 3,291 ms (3,239–4,511) | 2,574 ms (2,488–3,298) |
| Working set after the renderer workload | 395.6 MB | 178.8 MB |
| Dispatcher queue median | 0.0052 ms | 0.0066 ms |

This demonstrates reduced repeated-layout work and allocation pressure in these workloads. The Markdown test intentionally exercises reuse of identical content, not 25 unique first renders. The Canvas test rebinds distinct message objects with identical schemas. Timer scheduling is part of the streaming elapsed time; it is not a CPU-only rendering measurement. Dispatcher queue timing is not hardware input latency or a frame-time trace. The working-set reduction applies to this allocation-heavy benchmark, not every application state.

Raw samples and summary ranges: `2.1-ui-recheck-{1,2,3}.json`, `2.2-ui-recheck-{1,2,3}.json`, and their summary JSON files. Reproduce with `scripts/compare-native-render.ps1` after building the current candidate. The final benchmark also contains an assertion that switching identical Canvas structures does not leak state between messages.

## Startup proxy

`WaitForInputIdle` is a process startup proxy. It does not establish that network services are ready, nor that a user can complete every interaction. A controlled cold-cache experiment was not performed.

The later comparison starts both actual main windows against the current local history. The instrumented 2.1 baseline reads history but has saving disabled; its inability to modify the history was verified with a file hash. Three warm launches follow the first observed launch. These runs were sequential, not randomized.

| Metric | 2.1 recheck | 2.2 recheck |
|---|---:|---:|
| First observed launch | 1,333 ms | 662 ms |
| Median of three subsequent launches | 550 ms | 451 ms |
| Warm startup working-set median | 133.2 MB | 137.9 MB |

Earlier measurements are retained rather than discarded: original 2.1 warm launches were 218–242 ms; several intermediate 2.2 measurements were substantially slower during changing system conditions. Therefore no universal startup-speed or whole-app-memory claim is made. The later measurements are `2.1-startup-recheck.json` and `2.2-startup-recheck.json`.

## Network and inference are separate

The identical short tree-description prompt was sent to the public API. Vortex first-token samples were 1,430 ms before and 1,326 ms after. Zenith changed its default from Scout (25,379 ms in the baseline sample) to Mistral (264 ms in the later sample). This is a model-selection improvement, not a faster XAML renderer.

Provider variance remains substantial. Qwen 3.8 returned a first visible token in 1,315 ms through the local binding probe, but a later public Apex sample took 40,364 ms. Its actual medium/high coding requests took about 3,023/1,780 ms to first content respectively. Those individual samples do not establish a latency ranking or guarantee. No fallback secretly substitutes another model. The registry documents costs and availability; DeepSeek V4.1 is disabled because this account's Free plan rejected it.

See `2.1-network-baseline.json`, `2.2-network-after.json`, `2.2-model-probes.json`, `2.2-canvas-model-probes.json` and `2.2-apex-effort-probes.json`.

## Remaining measurement gaps

Hardware input latency, long-conversation switching time, frame-time scrolling, a controlled cold-cache launch, precise first-interactive time, statistically repeated inference latency and a complete DPI matrix are not verified. They are not replaced by the microbenchmarks above. Native window layouts, language changes, fullscreen and Canvas interaction were exercised separately; a clean Windows environment remains unavailable and the release stays a candidate at the user's request.
