// Derivation sources: where frames, loops, previews and stills are cut FROM. Playback URLs stay on Wikimedia Commons;
// upload.wikimedia.org rate-limits non-browser clients, so derivatives are made from these same-work copies instead.
// Every entry names the item page and the rights statement shown there (checked 2026-11-11).
const IA = (id, file) => `https://archive.org/download/${id}/${encodeURIComponent(file)}`;
const page = (id) => `https://archive.org/details/${id}`;
const A = (id, file, rights, note = '') => ({ url: IA(id, file), page: page(id), host: 'archive.org', rights, note });
const PDM = 'Public Domain Mark 1.0 (item page)';
const CC0 = 'CC0 1.0 (item page)';
const PDL = 'Public domain licence URL (item page)';
const CCBY3 = 'CC BY 3.0 (item page)';
const BLENDER = (url, page, rights) => ({ url, page, host: 'download.blender.org', rights });
export const derive = {
  // Blender official mirror
  sintel: BLENDER('https://download.blender.org/demo/movies/Sintel.2010.1080p.mkv', 'https://download.blender.org/demo/movies/', 'CC BY 3.0 (Blender Foundation release)'),
  'tears-of-steel': BLENDER('https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov', 'https://download.blender.org/demo/movies/ToS/', 'CC BY 3.0 (copyright.txt in the same folder)'),
  'elephants-dream': BLENDER('https://download.blender.org/ED/elephantsdream-720-h264-st-aac.mov', 'https://download.blender.org/ED/', 'CC BY 2.5 (Blender Foundation release)'),
  // archive.org copies of the same works
  spring: A('springopenmovie', 'springopenmovie.ia.mp4', 'CC BY 4.0 (item page)'),
  'cosmos-laundromat': A('CosmosLaundromatFirstCycle', 'Cosmos Laundromat - First Cycle (1080p).mp4', 'CC BY 4.0 (item page); Commons tags the file CC BY-SA 3.0, so derivatives are treated as BY-SA'),
  charge: A('charge-blender-open-movie-1608p', 'Charge - Blender Open Movie 1608p.mp4', 'Item page names Blender Studio as creator and says it is shared under an "open and free license" (no explicit CC URL); the film itself is CC BY 4.0 per Wikimedia Commons', 'Third-party upload of the same film; used only as the frame source'),
  charade: A('charade-1963-cary-grant-audrey-hepburn-walter-matthau-1080p-reup', 'Charade (1963) Cary Grant, Audrey Hepburn, Walter Matthau, James Coburn, George Kennedy; 1080p].ia.mp4', PDM),
  'a-trip-to-the-moon': A('le-voyage-dans-la-lune-1902-georges-melies', 'Le Voyage Dans La Lune - (1902) - Georges Méliès.ia.mp4', PDM),
  'the-cabinet-of-dr-caligari': A('DasKabinettdesDoktorCaligariTheCabinetofDrCaligari', 'The_Cabinet_of_Dr._Caligari_512kb.mp4', PDL),
  nosferatu: A('Nosferatu1922_58', 'Nosferatu-mid-3.mp4', PDM),
  'night-of-the-living-dead': A('Night.Of.The.Living.Dead_1080p', 'NightOfTheLivingDead_1080p.mp4', PDL),
  'caminandes-s1e1': A('Caminandes1LlamaDrama', '01_llama_drama_1080p.mp4', CCBY3),
  'caminandes-s1e2': A('Caminandes2GranDillama', '02_gran_dillama_1080p.mp4', CCBY3, 'Commons tags this film CC BY-SA 3.0; derivatives treated as BY-SA'),
  'caminandes-s1e3': A('CaminandesLlamigos', 'Caminandes_ Llamigos-1080p.mp4', CCBY3),
  'fleischer-superman-s1e1': A('superman_mechanical_monsters', 'superman_mechanical_monsters.mp4', CC0),
  'fleischer-superman-s1e2': A('superman_billion_dollar_limited', 'billion_dollar_limited.mp4', CC0),
  'fleischer-superman-s1e3': A('superman_arctic_giant', 'arctic_giant.mp4', CC0),
  'fleischer-superman-s1e4': A('superman_electric_earthquake_201801', 'superman_electric_earthquake.mp4', PDM),
  'felix-the-cat-1958-s1e1': A('felix-the-cat-1990s-syndication-of-the-1959-tv-series', 'Felix the Cat - Episode 1 (4 Episode Compilation).mp4', CC0, '1990s syndication print, episodes in a 4-episode compilation'),
  'hubblecast-s1e85': { url: 'https://cdn.esahubble.org/archives/videos/hd_1080p25_screen/hubblecast85a.mp4', page: 'https://esahubble.org/videos/hubblecast85a/', host: 'esahubble.org', rights: 'CC BY 4.0 (esahubble.org/copyright)', note: '' },
  'hubblecast-s1e87': { url: 'https://cdn.esahubble.org/archives/videos/hd_1080p25_screen/hubblecast87a.mp4', page: 'https://esahubble.org/videos/hubblecast87a/', host: 'esahubble.org', rights: 'CC BY 4.0 (esahubble.org/copyright)', note: '' },
};
