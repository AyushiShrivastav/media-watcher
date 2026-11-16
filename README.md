# Media Watcher

Enter a public figure's name and see the narratives forming about them in the news, with honest PR options for each.

- **News:** last 30 days of headlines from the Google News RSS feed (no key needed).
- **Analysis:** Claude groups the headlines into narratives and proposes three PR options per narrative.
- **Stack:** Next.js (App Router), no database. The action plan is saved in the browser.

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. In Vercel choose **Add New → Project** and import the repository. The defaults are correct.
3. Under **Environment Variables** add:
   - `ANTHROPIC_API_KEY` (required)
   - `ACCESS_CODE` (recommended: any phrase; visitors must enter it, so strangers cannot spend your API credit)
   - `ANTHROPIC_MODEL` (optional, defaults to `claude-sonnet-5-5`)
4. Deploy.

## Where things are

| File | What it does |
| --- | --- |
| `app/page.js` | The whole interface: search, overview, narratives, mentions, strategy, action plan |
| `app/api/analyze/route.js` | API endpoint: fetches news, runs the analysis |
| `lib/news.js` | Google News RSS fetch and parsing |
| `lib/analyze.js` | Prompt, Claude API call, output clean-up |

## Limits of this version

- News headlines only. Social platforms, video and forums are not included yet.
- The analysis reads headlines, not full articles, and can be wrong.
- No accounts or saved history; each search runs fresh.
