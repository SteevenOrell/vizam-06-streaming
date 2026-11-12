# Quality gate - 2026-11-12T10:19Z

| Step | Result | Detail |
|---|---|---|
| lint | PASS | npm run lint |
| typecheck | PASS | npm run typecheck |
| unit | PASS | npm run test |
| build | PASS | npm run build |
| e2e | PASS | npm run e2e |
| npm audit (production deps) | PASS | prod: 0 (high/critical 0); all deps: 0 |
| tracked private files (.env, .claude, CLAUDE.md, keys) | PASS |  |
| secret scan (working tree) | PASS |  |
| secret scan (full git history) | PASS |  |
| layout: no horizontal scroll from 300 px up (14 routes) | PASS |  |
| layout: below 250 px locked at 500 px, html pans | PASS |  |
| browser: console errors, failed requests, bad status | FAIL | /no-such-page @240px: HTTP 404 /no-such-page / console: Failed to load resource: the server responded with a status of 404 (Not Found) / page status 404<br>/no-such-page @300px: HTTP 404 /no-such-page / console: Failed to load resource: the server responded with a status of 404 (Not Found) / page status 404<br>/no-such-page @390px: HTTP 404 /no-such-page / console: Failed to load resource: the server responded with a status of 404 (Not Found) / page status 404<br>/no-such-page @768px: HTTP 404 /no-such-page / console: Failed to load resource: the server responded with a status of 404 (Not Foun |
| images: none broken | PASS |  |
| cards: equal height within a row | WARN | /watch/sintel @768px: div.relative heights 156/166<br>/watch/caminandes?s=1&e=1 @768px: div.relative heights 156/166 |
| internal links (47 checked) | PASS |  |
