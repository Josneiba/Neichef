const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const key = process.env.GOOGLE_API_KEY;
const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

(async () => {
  for (const model of models) {
    const body = {
      contents: [{ parts: [{ text: 'Return JSON: {"ok":true}' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 64 },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log('MODEL', model, 'STATUS', res.status);
    console.log(text.slice(0, 800));
    console.log('---');
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
