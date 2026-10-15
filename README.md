# Lemon AI

Lemon AI opens directly into a streaming multi-model chat. Conversations and model choices are saved on this device. The existing study tools remain available at `/learn`.

## Chat models and Cloudflare setup

Chat uses the existing Cloudflare Workers AI binding directly. No runtime API token, AI Gateway credits, billing activation, or payment method is required on Workers Free. Workers Free includes 10,000 Neurons per day; requests fail when the allocation is exhausted. On an already paid account, Cloudflare's existing account pricing still applies; this app does not change account plans or billing settings.

Available models: Llama 4 Scout (131,000-token context) and Llama 3.3 70B (24,000-token context). OpenAI GPT-4.1, GPT-4.1 mini, and Claude Sonnet 5 are visible but disabled because the current setup excludes paid providers. The server rejects these IDs, including direct API requests. Context sizes are model capacity, not free usage allowances.

Replies stream from the selected model with up to 4,096 output tokens. Conversation history is not silently truncated. The model enforces its context limit. Incoming bodies are capped at 1 MB. Conversations are stored only on this device, and interrupted text is retained.

Authenticate and use the existing build/deploy commands:

```bash
npx wrangler login
npm run preview
npm run deploy
```

References: [Workers AI pricing and free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Llama 4 Scout](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/), [Llama 3.3](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/).
## Local development

The interface can run with:

```bash
npm run dev
```

Workers AI uses Cloudflare's remote `AI` binding. Authenticate Wrangler once and use the Cloudflare preview runtime for real generation:

```bash
npx wrangler login
npm run preview
```

No OpenAI API key is required. The Workers AI binding and model are configured in `wrangler.jsonc` and `lib/cloudflare-ai/structured-output.ts`.

## Validation

```bash
npm ci
npm run lint
npm run build
npx opennextjs-cloudflare build
npx wrangler deploy --dry-run
```

Workspace data and study progress are stored locally in the browser. The storage document is versioned, and the current migration imports the previous Lemon AI v1 workspace format.
