import { fetchNews } from '../../../lib/news';
import { analyze } from '../../../lib/analyze';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const name = typeof body.name === 'string' ? body.name.replace(/["\\<>]/g, '').trim().slice(0, 80) : '';
  if (name.length < 3) {
    return Response.json({ error: 'Enter the full name of a public figure.' }, { status: 400 });
  }
  const required = process.env.ACCESS_CODE;
  if (required && body.code !== required) {
    return Response.json({ error: 'That access code is not right.', needsCode: true }, { status: 401 });
  }

  let mentions;
  try {
    mentions = await fetchNews(name);
  } catch (e) {
    return Response.json({ error: `Could not load news. ${e.message}` }, { status: 502 });
  }
  if (mentions.length < 3) {
    return Response.json({ name, mentions, analysis: null, notice: 'Too few recent news mentions were found to identify narratives. Check the spelling or try the name the press uses.' });
  }

  try {
    const analysis = await analyze(name, mentions);
    return Response.json({ name, mentions, analysis, fetchedAt: new Date().toISOString() });
  } catch (e) {
    // Still return the mentions so the feed works without the AI step.
    return Response.json({ name, mentions, analysis: null, notice: e.message, fetchedAt: new Date().toISOString() });
  }
}

// Lets the page know whether an access code is needed, without revealing it.
export async function GET() {
  return Response.json({ needsCode: Boolean(process.env.ACCESS_CODE) });
}
