# Media Watcher

Enter a public figure's name and see the narratives forming about them in the news, with honest PR options for each.

- **News:** last 30 days of headlines from the Google News RSS feed (no key needed).
- **Analysis:** a deterministic placeholder (`lib/analyze.js`). Fixed keyword rules group headlines into themes, score tone and trend, and attach template PR options. The same headlines always give the same result. It is a stand-in for the real algorithm; replace the body of `analyze()` and keep its return shape.
- **Stack:** Next.js (App Router), no database. The action plan is saved in the browser.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

No API keys are needed.

- **Render:** New → Blueprint, pick this repository, apply. `render.yaml` holds the settings.
- **Vercel:** Add New → Project, import this repository, deploy.

Optional: set an `ACCESS_CODE` environment variable to require a code before searches run.

## Where things are

| File | What it does |
| --- | --- |
| `app/page.js` | The whole interface: search, overview, narratives, mentions, strategy, action plan |
| `app/api/analyze/route.js` | API endpoint: fetches news, runs the analysis |
| `lib/news.js` | Google News RSS fetch and parsing |
| `lib/analyze.js` | Placeholder analysis engine (deterministic rules) |

## Limits of this version

- News headlines only. Social platforms, video and forums are not included yet.
- The analysis is a keyword-rule placeholder. It reads headlines, not full articles, and its themes and tone are rough.
- No accounts or saved history; each search runs fresh.
