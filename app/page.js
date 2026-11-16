'use client';

import { useEffect, useMemo, useState } from 'react';

const TONE_LABEL = { favorable: 'Favorable', unfavorable: 'Unfavorable', mixed: 'Mixed' };
const TREND_LABEL = { rising: 'Rising', steady: 'Steady', fading: 'Fading' };
const PLAN_KEY = 'media-watcher-plan';

function loadPlan() {
  try { return JSON.parse(window.localStorage.getItem(PLAN_KEY)) || []; } catch { return []; }
}
function savePlan(plan) {
  try { window.localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); } catch {}
}
function fmtDate(iso) {
  if (!iso) return 'Undated';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Logo() {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="13" cy="13" r="10.5" /><circle cx="13" cy="13" r="4" />
    </svg>
  );
}

function Tone({ tone }) {
  return <span className={`tone ${tone}`}>{TONE_LABEL[tone]}</span>;
}

export default function Page() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [view, setView] = useState('overview');
  const [sel, setSel] = useState(null);
  const [playIdx, setPlayIdx] = useState({});
  const [range, setRange] = useState(14);
  const [filter, setFilter] = useState({ q: '', tone: 'all', narr: 'all' });
  const [plan, setPlan] = useState([]);

  useEffect(() => {
    setPlan(loadPlan());
    fetch('/api/analyze').then((r) => r.json()).then((j) => setNeedsCode(Boolean(j.needsCode))).catch(() => {});
  }, []);

  async function run(e) {
    if (e) e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, code }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.needsCode) setNeedsCode(true);
        setError(json.error || 'Something went wrong.');
      } else {
        setData(json);
        setView('overview');
        setSel(json.analysis && json.analysis.narratives[0] ? json.analysis.narratives[0].id : null);
        setPlayIdx({});
        setFilter({ q: '', tone: 'all', narr: 'all' });
      }
    } catch {
      setError('Could not reach the server. Try again.');
    }
    setLoading(false);
  }

  const narratives = (data && data.analysis && data.analysis.narratives) || [];
  const mentions = (data && data.mentions) || [];
  const cur = narratives.find((n) => n.id === sel) || narratives[0] || null;

  // Which narrative and tone each mention belongs to.
  const tagged = useMemo(() => {
    const owner = {};
    narratives.forEach((n) => n.mentions.forEach((i) => { owner[i] = n; }));
    return mentions.map((m, i) => ({ ...m, i, narr: owner[i] || null }));
  }, [data]);

  const shown = tagged.filter((m) => {
    if (filter.tone !== 'all' && (!m.narr || m.narr.tone !== filter.tone)) return false;
    if (filter.narr !== 'all' && (!m.narr || m.narr.id !== filter.narr)) return false;
    const q = filter.q.trim().toLowerCase();
    if (q && !`${m.title} ${m.source}`.toLowerCase().includes(q)) return false;
    return true;
  });

  // Mentions per day for the selected narrative.
  const bars = useMemo(() => {
    if (!cur) return [];
    const counts = Array(range).fill(0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    cur.mentions.forEach((i) => {
      const m = mentions[i];
      if (!m || !m.date) return;
      const d = new Date(m.date); d.setHours(0, 0, 0, 0);
      const ago = Math.round((today - d) / 86400000);
      if (ago >= 0 && ago < range) counts[range - 1 - ago] += 1;
    });
    const max = Math.max(1, ...counts);
    return counts.map((c) => Math.round((c / max) * 118));
  }, [cur, range, data]);

  function updatePlan(next) { setPlan(next); savePlan(next); }
  const chosen = cur ? (playIdx[cur.id] || 0) : 0;
  const play = cur ? cur.plays[chosen] || cur.plays[0] : null;
  const planId = cur && play ? `${data.name}|${cur.name}|${play.name}` : '';
  const inPlan = plan.some((p) => p.id === planId);
  function togglePlan() {
    if (inPlan) updatePlan(plan.filter((p) => p.id !== planId));
    else updatePlan([...plan, { id: planId, person: data.name, narrative: cur.name, play: play.name, steps: play.steps.map((text) => ({ text, done: false })) }]);
  }
  function toggleStep(id, si) {
    updatePlan(plan.map((p) => (p.id !== id ? p : { ...p, steps: p.steps.map((s, i) => (i === si ? { ...s, done: !s.done } : s)) })));
  }

  const attention = narratives.filter((n) => n.tone === 'unfavorable' && n.trend === 'rising');
  const favShare = narratives.filter((n) => n.tone === 'favorable').reduce((a, n) => a + n.share, 0);

  const form = (
    <form onSubmit={run} className="row" style={{ alignItems: 'flex-end' }}>
      <div className="field" style={{ flex: '2 1 240px' }}>
        <label htmlFor="name">Public figure&apos;s name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name as the press writes it" required minLength={3} maxLength={80} />
      </div>
      {needsCode && (
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor="code">Access code</label>
          <input id="code" type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
        </div>
      )}
      <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Analyzing…' : 'Analyze coverage'}</button>
    </form>
  );

  if (!data) {
    return (
      <>
        <header className="topbar"><div className="topbar-in"><div className="brand"><Logo />Media Watcher</div></div></header>
        <main className="hero stack">
          <h1>See the story forming about you in the news</h1>
          <p className="muted">Enter a public figure&apos;s name. Media Watcher reads the last 30 days of news headlines, groups them into narratives, and lays out honest PR options for each one.</p>
          <div className="card">{form}{error && <p role="alert" className="warn">{error}</p>}</div>
          {loading && <p className="muted" role="status">Reading headlines and grouping them. This usually takes 15 to 40 seconds.</p>}
          <p className="small muted">Built for public figures and their teams. Analysis is based on headlines only and can be wrong; read the coverage before acting.</p>
        </main>
      </>
    );
  }

  const nav = [
    ['overview', 'Overview', ''],
    ['narratives', 'Narratives', narratives.length || ''],
    ['mentions', 'Mentions', mentions.length || ''],
    ['strategy', 'Strategy', ''],
    ['plan', 'Action plan', plan.length || ''],
  ];

  const narrativePicker = (
    <div className="row">
      {narratives.map((n) => (
        <button key={n.id} type="button" className="chip" aria-pressed={n.id === (cur && cur.id)} onClick={() => setSel(n.id)}>{n.name}</button>
      ))}
    </div>
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <div className="brand"><Logo />Media Watcher</div>
          <div className="right">
            <span className="pill">{data.name}</span>
            <span className="pill muted">News, last 30 days</span>
            <button type="button" className="btn" onClick={() => { setData(null); setError(''); }}>New search</button>
          </div>
        </div>
      </header>

      <div className="shell">
        <nav className="side" aria-label="Sections">
          {nav.map(([id, label, count]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>
              <span>{label}</span><span className="count">{count}</span>
            </button>
          ))}
        </nav>

        <main className="main">
          {data.notice && <p className="notice" role="status">{data.notice}</p>}

          {view === 'overview' && (
            <div className="stack">
              <h1>What the news is saying about {data.name}</h1>
              {data.analysis && data.analysis.overall && <p>{data.analysis.overall}</p>}
              <div className="grid">
                <div className="stat"><span className="small muted">News mentions found</span><b>{mentions.length}</b></div>
                <div className="stat"><span className="small muted">Narratives</span><b>{narratives.length}</b></div>
                <div className="stat"><span className="small muted">Need attention</span><b>{attention.length}</b></div>
                <div className="stat"><span className="small muted">Favorable share</span><b>{favShare}%</b></div>
              </div>
              {narratives.length > 0 && (
                <section className="card">
                  <h2>Share of conversation</h2>
                  <div className="sharebar" aria-hidden="true">
                    {narratives.map((n) => <div key={n.id} className={`fill-${n.tone}`} style={{ flexGrow: n.share || 1, flexBasis: 0 }} />)}
                  </div>
                  <div>
                    {narratives.map((n) => (
                      <button key={n.id} type="button" className="nrow" onClick={() => { setSel(n.id); setView('narratives'); }}>
                        <span className={`dot fill-${n.tone}`} aria-hidden="true" />
                        <span className="name">{n.name}</span>
                        <Tone tone={n.tone} />
                        <span className="small muted">{TREND_LABEL[n.trend]}</span>
                        <span className="share">{n.share}%</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {attention.length > 0 && (
                <section className="card">
                  <h2>Needs attention</h2>
                  {attention.map((n) => (
                    <div key={n.id} className="warn">
                      <b>{n.name}</b>
                      <span>{n.summary}</span>
                      <button type="button" className="btn primary" onClick={() => { setSel(n.id); setView('strategy'); }}>See strategy options</button>
                    </div>
                  ))}
                </section>
              )}
            </div>
          )}

          {view === 'narratives' && (
            <div className="stack">
              <h1>Narratives</h1>
              {!cur && <p className="muted">No narratives yet. See the note above.</p>}
              {cur && (
                <>
                  {narrativePicker}
                  <section className="card">
                    <div className="row">
                      <h2>{cur.name}</h2><Tone tone={cur.tone} />
                      <span className="small muted">{TREND_LABEL[cur.trend]} · {cur.share}% of conversation · {cur.mentions.length} mentions</span>
                    </div>
                    <p style={{ maxWidth: '68ch' }}>{cur.summary}</p>
                    <div className="row between">
                      <h3 className="label">Mentions per day, last {range} days</h3>
                      <div className="row">
                        {[7, 14, 30].map((r) => <button key={r} type="button" className="chip" aria-pressed={range === r} onClick={() => setRange(r)}>{r} days</button>)}
                      </div>
                    </div>
                    <div className="bars" aria-hidden="true">
                      {bars.map((h, i) => <div key={i} className={`fill-${cur.tone}`} style={{ height: h }} />)}
                    </div>
                    {cur.drivers.length > 0 && (
                      <>
                        <h3 className="label">Who is driving it</h3>
                        <div className="grid">
                          {cur.drivers.map((d, i) => <div key={i} className="soft"><b>{d.who}</b><span className="small">{d.note}</span></div>)}
                        </div>
                      </>
                    )}
                    <div className="row">
                      <button type="button" className="btn primary" onClick={() => setView('strategy')}>See strategy options</button>
                      <button type="button" className="btn" onClick={() => { setFilter({ q: '', tone: 'all', narr: cur.id }); setView('mentions'); }}>View its mentions</button>
                    </div>
                  </section>
                </>
              )}
            </div>
          )}

          {view === 'mentions' && (
            <div className="stack">
              <h1>Mentions</h1>
              <section className="card">
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <div className="field" style={{ flex: '2 1 240px' }}>
                    <label htmlFor="q">Search</label>
                    <input id="q" type="search" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="Outlet or keyword" />
                  </div>
                  <div className="field">
                    <label htmlFor="fn">Narrative</label>
                    <select id="fn" value={filter.narr} onChange={(e) => setFilter({ ...filter, narr: e.target.value })}>
                      <option value="all">All narratives</option>
                      {narratives.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="ft">Tone</label>
                    <select id="ft" value={filter.tone} onChange={(e) => setFilter({ ...filter, tone: e.target.value })}>
                      <option value="all">All tones</option>
                      <option value="favorable">Favorable</option>
                      <option value="unfavorable">Unfavorable</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
              </section>
              <p className="muted">Showing {shown.length} of {mentions.length} mentions</p>
              {shown.length === 0 && (
                <div className="card"><span>No mentions match these filters.</span>
                  <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setFilter({ q: '', tone: 'all', narr: 'all' })}>Clear filters</button>
                </div>
              )}
              {shown.map((m) => (
                <article key={m.i} className="mention">
                  <div className="row small">
                    <b style={{ fontSize: 15 }}>{m.source}</b>
                    <span className="muted">{fmtDate(m.date)}</span>
                    {m.narr && <Tone tone={m.narr.tone} />}
                  </div>
                  {m.link ? <a href={m.link} target="_blank" rel="noopener noreferrer">{m.title}</a> : <span>{m.title}</span>}
                  <span className="small muted">{m.narr ? `Narrative: ${m.narr.name}` : 'Not part of a narrative'}</span>
                </article>
              ))}
            </div>
          )}

          {view === 'strategy' && (
            <div className="stack">
              <h1>Strategy</h1>
              {!cur && <p className="muted">No narratives to respond to yet. See the note above.</p>}
              {cur && play && (
                <>
                  {narrativePicker}
                  <section className="card">
                    <div className="row"><h2>{cur.name}</h2><Tone tone={cur.tone} /><span className="small muted">{TREND_LABEL[cur.trend]}</span></div>
                    <div className="grid">
                      {cur.plays.map((p, i) => (
                        <button key={i} type="button" className="pick" aria-pressed={i === chosen} onClick={() => setPlayIdx({ ...playIdx, [cur.id]: i })}>
                          <span className="label">{p.fit}</span><span className="name">{p.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="grid-wide">
                      <div className="stack">
                        <div><h3 className="label">Why this fits</h3><p>{play.why}</p></div>
                        <div><h3 className="label">First steps</h3><ol>{play.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
                      </div>
                      <div className="stack">
                        <div className="soft"><h3 className="label">How we will know it worked</h3><p>{play.watch}</p></div>
                        <div className="soft"><h3 className="label">Trade-off</h3><p>{play.risk}</p></div>
                      </div>
                    </div>
                    <button type="button" className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={togglePlan}>{inPlan ? 'Remove from action plan' : 'Add to action plan'}</button>
                  </section>
                </>
              )}
            </div>
          )}

          {view === 'plan' && (
            <div className="stack">
              <h1>Action plan</h1>
              {plan.length === 0 && <p className="muted">Nothing here yet. Choose a play in Strategy and add it. The plan is saved in this browser.</p>}
              {plan.map((p) => (
                <section key={p.id} className="card">
                  <div className="row between">
                    <span><b>{p.play}</b> <span className="muted">for “{p.narrative}” · {p.person} · {p.steps.filter((s) => s.done).length} of {p.steps.length} done</span></span>
                    <button type="button" className="link-btn" onClick={() => updatePlan(plan.filter((x) => x.id !== p.id))}>Remove</button>
                  </div>
                  {p.steps.map((s, i) => (
                    <label key={i} className="check"><input type="checkbox" checked={s.done} onChange={() => toggleStep(p.id, i)} /><span>{s.text}</span></label>
                  ))}
                </section>
              ))}
            </div>
          )}

          <p className="small muted">Analysis is generated by an AI model from news headlines only and can be wrong. Read the coverage before acting.</p>
        </main>
      </div>
    </>
  );
}
