// Usage: node scripts/media/timedtext-list.mjs "Big Buck Bunny 4K.webm" ...  -> lists TimedText subtitle pages on Commons for each file
const UA = 'afterlight-media-research/1.0 (portfolio concept)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const f of process.argv.slice(2)) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({ action: 'query', format: 'json', list: 'allpages', apnamespace: '710', apprefix: f, aplimit: '50' });
  let j; for (let a = 0; a < 5; a++) { const t = await (await fetch(u, { headers: { 'User-Agent': UA } })).text(); try { j = JSON.parse(t); break; } catch { await sleep(4000 * (a + 1)); } }
  console.log(f + ' -> ' + (j?.query?.allpages ?? []).map((p) => p.title.replace('TimedText:' + f + '.', '')).join(', '));
  await sleep(1200);
}
