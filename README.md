# Lemon AI

Lemon AI turns source material into persistent topic workspaces with reusable notes, explanations, flashcards, quizzes, timelines, comparisons, and key-term lists.

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
