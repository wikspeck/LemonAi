# Lemon 2.2 model verification — 2026-10-25

The registry is the single backend source of model IDs and tier defaults. Native controls consume that registry; adding a model requires no XAML changes. Existing models and the Lemon 1 endpoint remain available.

## New candidates tested against the existing account

| Model | Context | Input/output USD per million tokens | License | First visible token, one short prompt | Canvas calculator |
|---|---:|---:|---|---:|---|
| Qwen 3.8 27B | 262,144 | 0.45 / 3.20 | Apache-2.0 | 1,315 ms | 5,839 ms; production schema passed |
| GLM 4.7 Flash | 131,072 | 0.0605 / 0.40 | MIT | 9,683 ms | 25,054 ms; production schema passed |
| Mistral Small 3.1 (existing, rechecked) | 128,000 | 0.351 / 0.555 | Apache-2.0 | 799 ms | 3,669 ms; production schema passed |
| DeepSeek V4.1 Flash | 1,048,576 | 0.30 / 1.20 | Upstream terms; not enabled | Rejected by account: Workers Paid required | Not run |

All exact IDs are copied from Cloudflare's model documentation. Streaming tests distinguish final content from separate reasoning deltas. The old DeepSeek R1 distillation remains disabled because its previous output did not produce a reliable final answer within Lemon's budget. DeepSeek V4.1 is listed as disabled with the observed billing restriction, rather than silently routing to another model. No plan upgrade was performed.

These are individual availability and latency samples, not statistical benchmarks or a general model-quality ranking. Context windows are provider limits, not tested maximum conversation lengths. Canvas success on one calculator is a regression sample, not a guarantee for all generated schemas. Every Canvas response still passes strict validation and a bounded repair/fallback path.

## Tier choices

- Vortex: economical Qwen3 30B A3B for direct requests.
- Zenith: Mistral Small 3.1 as the default for responsive general chat; Scout, Llama 3.3 and GLM remain explicit alternatives. Scout's baseline first-token sample was 25,379 ms, motivating a faster default, not removal.
- Apex: Qwen 3.8, offering a larger documented context and model-native reasoning control; Gemma 4 remains available. This profile costs more and is not promised to always respond faster or better.

Low/Medium/High retain output budgets 1,024/2,048/4,096. For Qwen 3.8 they also map to its documented native values low/medium/xhigh. Other enabled models use output budgets and instructions only. Actual Apex medium/high coding requests returned complete functions with empty-input guards; timings and generated responses are in `performance/2.2-apex-effort-probes.json`. Those functions were not executed as trusted code.

## Primary references

- [Cloudflare Qwen 3.8: exact ID, context, reasoning values, streaming and price](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/)
- [Official Qwen model card and license](https://huggingface.co/Qwen/Qwen3.8-27B)
- [Cloudflare GLM 4.7 Flash](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/)
- [Official GLM model card and MIT license](https://huggingface.co/zai-org/GLM-4.7-Flash)
- [Cloudflare Mistral Small 3.1](https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/)
- [Cloudflare DeepSeek V4.1 and paid-plan restriction](https://developers.cloudflare.com/workers-ai/models/deepseek-v4.1-flash-1017/)

Raw streaming results: `performance/2.2-model-probes.json`. Canvas outputs, including production-schema validation: `performance/2.2-canvas-model-probes.json`.
