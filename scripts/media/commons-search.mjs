// Usage: node scripts/media/commons-search.mjs "query" ["query2" ...]  -> lists File: titles (video/audio namespace 6)
const UA = 'afterlight-media-research/1.0 (portfolio concept)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const q of process.argv.slice(2)) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({ action: 'query', format: 'json', list: 'search', srnamespace: '6', srlimit: '8', srsearch: q });
  let j;
  for (let a = 0; a < 5; a++) { const t = await (await fetch(u, { headers: { 'User-Agent': UA } })).text(); try { j = JSON.parse(t); break; } catch { await sleep(4000 * (a + 1)); } }
  console.log('== ' + q); for (const r of j?.query?.search ?? []) console.log('  ' + r.title);
  await sleep(1500);
}
