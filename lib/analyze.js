// PLACEHOLDER ANALYSIS ENGINE (deterministic, no AI, no external calls).
//
// The same headlines always produce the same result. This is a stand-in for the
// real core algorithm. To replace it, keep the contract below and swap the body
// of analyze().
//
// Contract
//   analyze(name, mentions) -> {
//     engine:  string identifying the engine version
//     overall: one-sentence summary
//     narratives: [{
//       id, name,
//       tone:  'favorable' | 'unfavorable' | 'mixed',
//       trend: 'rising' | 'steady' | 'fading',
//       share: whole-number percent of grouped mentions,
//       summary,
//       drivers:  [{ who, note }],
//       mentions: [indexes into the mentions array],
//       plays:    [{ name, fit, why, steps: [..], watch, risk }]
//     }]
//   }
//   mentions: [{ title, source, link, date }] as returned by lib/news.js

export const ENGINE = 'placeholder-rules-v0';

// Themes are checked in this order; a headline joins the first one it matches.
const THEMES = [
  { name: 'Legal and controversy', words: ['lawsuit', 'sued', 'sues', 'court', 'trial', 'arrest', 'arrested', 'charged', 'charges', 'allegation', 'allegations', 'accused', 'scandal', 'controversy', 'backlash', 'criticized', 'criticised', 'slammed', 'apology', 'apologizes', 'apologises', 'investigation', 'feud'] },
  { name: 'Awards and recognition', words: ['award', 'awards', 'nominee', 'nominated', 'nomination', 'nominations', 'wins', 'winner', 'honor', 'honored', 'honour', 'honoured', 'oscar', 'oscars', 'emmy', 'emmys', 'grammy', 'grammys', 'prize', 'shortlist'] },
  { name: 'Work and projects', words: ['film', 'movie', 'series', 'album', 'tour', 'role', 'cast', 'premiere', 'trailer', 'season', 'show', 'single', 'release', 'released', 'starring', 'stars', 'concert', 'book', 'match', 'game', 'performance', 'debut'] },
  { name: 'Business and brands', words: ['brand', 'deal', 'partnership', 'campaign', 'launch', 'launches', 'investment', 'invests', 'company', 'ambassador', 'collaboration', 'startup', 'stake', 'endorsement'] },
  { name: 'Personal life', words: ['dating', 'married', 'marriage', 'wedding', 'baby', 'divorce', 'split', 'family', 'relationship', 'pregnant', 'birthday', 'engaged', 'girlfriend', 'boyfriend', 'husband', 'wife', 'health'] },
  { name: 'Statements and interviews', words: ['says', 'said', 'interview', 'reveals', 'revealed', 'opens', 'responds', 'response', 'statement', 'speaks', 'explains', 'talks', 'admits', 'shares'] },
];
const FALLBACK_THEME = 'General coverage';

const POSITIVE = ['wins', 'win', 'won', 'praise', 'praised', 'acclaimed', 'best', 'record', 'success', 'celebrates', 'celebrated', 'honor', 'honored', 'honoured', 'award', 'nominated', 'triumph', 'stunning', 'beloved', 'hit', 'comeback', 'support', 'donates', 'charity', 'breakthrough', 'loved', 'rave', 'tops'];
const NEGATIVE = ['lawsuit', 'sued', 'arrest', 'arrested', 'charged', 'accused', 'allegations', 'scandal', 'controversy', 'backlash', 'criticized', 'criticised', 'slammed', 'apology', 'fired', 'dropped', 'boycott', 'flop', 'fails', 'failed', 'feud', 'outrage', 'cancelled', 'canceled', 'divorce', 'split', 'injury', 'banned', 'investigation', 'leak', 'leaked'];

const PLAYS = {
  unfavorableRising: [
    { name: 'Let others speak on the record', fit: 'Best fit', why: 'Unfavorable coverage that is growing is rarely settled by the person at the centre of it. Named, credible third parties carry more weight.', steps: ['List two or three people with first-hand knowledge who may be willing to speak in their own words', 'Offer the fullest available context to one outlet that will run it fairly', 'Bring forward real, already-planned content for the next two weeks'], watch: 'New headlines start citing the on-record voices, and daily volume stops growing.', risk: 'Slow to land and depends on others being willing. They must never be scripted.' },
    { name: 'Address it once, directly', fit: 'Alternative', why: 'One calm, specific answer in a setting already on the calendar can close the question without making it the headline.', steps: ['Pick one scheduled interview or appearance with a trusted journalist', 'Prepare a short, factual answer', 'Do not repeat it elsewhere'], watch: 'Coverage quotes the answer and follow-up questions fade within a week.', risk: 'Extends the news cycle by a few days and introduces the story to new readers.' },
    { name: 'Hold and monitor', fit: 'Lower effort', why: 'If the coverage is concentrated in a few outlets, it may fade without a response.', steps: ['Set a threshold for when to respond, such as pickup by a major outlet', 'Draft the direct answer now so it is ready', 'Review in seven days'], watch: 'Daily volume flattens and no major outlet picks it up.', risk: 'If it spreads, the response will look late.' },
  ],
  unfavorableOther: [
    { name: 'Do not reopen it', fit: 'Best fit', why: 'Unfavorable coverage that is steady or fading usually ends sooner without a new statement to restart it.', steps: ['Make no new public comment on the topic', 'Agree a short answer in case it comes up in interviews', 'Review in two weeks'], watch: 'Its share of coverage keeps falling.', risk: 'The criticism goes unanswered, which some people will remember.' },
    { name: 'Show evidence, not words', fit: 'Alternative', why: 'Where the criticism is about conduct, verifiable action answers it better than a statement.', steps: ['Identify what has actually been done that can be independently checked', 'Publish only what is verifiable', 'Let critics respond without arguing back'], watch: 'Critical outlets acknowledge the evidence or move on.', risk: 'Only works if the action is real. Overstating it makes things worse.' },
    { name: 'Review the underlying issue', fit: 'Longer term', why: 'If the criticism is well founded, the lasting fix is a decision, not a message.', steps: ['Collect the strongest criticisms on one page', 'Discuss them with the people who can change the underlying issue', 'Decide before the next public moment'], watch: 'A clear decision exists before the topic next comes up.', risk: 'Not a quick fix for this month.' },
  ],
  favorable: [
    { name: 'One in-depth piece', fit: 'Best fit', why: 'Favorable coverage is already forming. A single substantial interview or profile lets the person shape it in their own terms.', steps: ['Shortlist two writers or shows that cover substance', 'Agree what is and is not open for discussion', 'Time it for the next natural peak of attention'], watch: 'Later coverage borrows framing and quotes from the piece.', risk: 'Depth invites personal questions. Set limits first.' },
    { name: 'Give supporters real material', fit: 'Alternative', why: 'Audiences who are already positive will carry the story further if they have something genuine to share.', steps: ['Release behind-the-scenes material that already exists', 'Do one live question-and-answer session', 'Credit community work when sharing it'], watch: 'Coverage and sharing continue between major moments.', risk: 'Reach stays mostly within the existing audience.' },
    { name: 'Let it run', fit: 'Lower effort', why: 'Favorable coverage that is growing without help can look manufactured if pushed.', steps: ['Keep the current schedule', 'Avoid stacking new announcements on top of it', 'Review in two weeks'], watch: 'Volume holds without added activity.', risk: 'Misses the chance to shape the story while attention is high.' },
  ],
  mixed: [
    { name: 'Clarify with facts', fit: 'Best fit', why: 'Mixed coverage often comes from missing context. Supplying plain facts can tip it without confrontation.', steps: ['Identify the two or three facts most often missing from the coverage', 'Share them with the outlets covering the topic most', 'Keep the tone neutral'], watch: 'New headlines include the added context.', risk: 'Engaging at all adds some attention to the topic.' },
    { name: 'Redirect to current work', fit: 'Alternative', why: 'Where there is real news about the work, it can fill the space this topic occupies.', steps: ['Line up the next genuine announcement or release', 'Keep personal channels focused on that work', 'Review monthly'], watch: 'This theme shrinks as a share of coverage.', risk: 'Does not answer the underlying questions.' },
    { name: 'Monitor only', fit: 'Lower effort', why: 'A small, mixed theme often needs no response.', steps: ['Set a volume threshold that would trigger a review', 'Check weekly', 'Revisit if tone shifts'], watch: 'Volume and tone stay where they are.', risk: 'A shift in tone could be noticed late.' },
  ],
};

const tokens = (s) => String(s).toLowerCase().match(/[a-z']+/g) || [];
const countIn = (words, list) => words.reduce((a, w) => a + (list.includes(w) ? 1 : 0), 0);

function toneOf(items) {
  let pos = 0;
  let neg = 0;
  items.forEach((m) => { const w = tokens(m.title); pos += countIn(w, POSITIVE); neg += countIn(w, NEGATIVE); });
  if (neg > pos) return 'unfavorable';
  if (pos > neg) return 'favorable';
  return 'mixed';
}

function trendOf(items, now) {
  let recent = 0;
  let prior = 0;
  items.forEach((m) => {
    if (!m.date) return;
    const days = (now - new Date(m.date).getTime()) / 86400000;
    if (days < 7) recent += 1; else if (days < 14) prior += 1;
  });
  if (recent >= 2 && recent > prior * 1.3) return 'rising';
  if (prior >= 2 && recent < prior * 0.7) return 'fading';
  return 'steady';
}

function driversOf(items) {
  const by = {};
  items.forEach((m) => { by[m.source] = (by[m.source] || 0) + 1; });
  return Object.entries(by)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([who, n]) => ({ who, note: `${n} ${n === 1 ? 'headline' : 'headlines'} on this theme` }));
}

// `now` can be passed in so results are reproducible in tests.
export async function analyze(name, mentions, now = Date.now()) {
  const groups = {};
  mentions.forEach((m, i) => {
    const w = tokens(m.title);
    const theme = THEMES.find((t) => w.some((x) => t.words.includes(x)));
    const key = theme ? theme.name : FALLBACK_THEME;
    (groups[key] = groups[key] || []).push(i);
  });

  const total = mentions.length || 1;
  const narratives = Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([themeName, idx], n) => {
      const items = idx.map((i) => mentions[i]);
      const tone = toneOf(items);
      const trend = trendOf(items, now);
      const outlets = new Set(items.map((m) => m.source)).size;
      const latest = items[0];
      const key = tone === 'unfavorable' ? (trend === 'rising' ? 'unfavorableRising' : 'unfavorableOther') : tone;
      return {
        id: `n${n + 1}`,
        name: themeName,
        tone,
        trend,
        share: Math.round((idx.length / total) * 100),
        summary: `${idx.length} ${idx.length === 1 ? 'headline' : 'headlines'} from ${outlets} ${outlets === 1 ? 'outlet' : 'outlets'} fall under this theme. Most recent: “${latest.title}” (${latest.source}).`,
        drivers: driversOf(items),
        mentions: idx,
        plays: PLAYS[key],
      };
    });

  const unfav = narratives.filter((n) => n.tone === 'unfavorable').length;
  const overall = narratives.length
    ? `${mentions.length} recent headlines about ${name} fall into ${narratives.length} ${narratives.length === 1 ? 'theme' : 'themes'}; the largest is “${narratives[0].name}”, and ${unfav} ${unfav === 1 ? 'theme reads' : 'themes read'} as unfavorable.`
    : '';
  return { engine: ENGINE, overall, narratives };
}
