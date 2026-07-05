## Scalability notes

- Vision provider: abstracted in `lib/vision/detect-ingredients.ts`. Swap this file for a paid provider (e.g., Google Vision, AWS Rekognition, or a managed HF inference) when traffic requires higher throughput or lower latency.
- External recipes: TheMealDB integration lives in `lib/recipes/external-source.ts`. To move to a paid recipe provider, replace the functions in that file; DB caching uses the `Recipe.source` and `Recipe.externalId` fields so cached items will remain searchable.
- Notifications: email sending is wrapped (planned) in `lib/notifications/send-email.ts`; switching providers requires minimal change to that wrapper.
- Cron & rate-limiting: production should use Vercel Cron to hit `/api/cron/check-expirations`. Keep Upstash rate limiting in front of public image/receipt endpoints to protect inference costs.
- Data growth: recipes are cached in the main `Recipe` table with `source = 'external'`, so user recipes and external recipes are in the same index paths and searchable via the existing queries.
