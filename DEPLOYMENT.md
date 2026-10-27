# Bigfin Squid / Project management software web deployment

Production URL: https://projectmanager.11mosswood.us/app/ . Marketing page is the hostname root. Browser-local IndexedDB and explicit JSON import/export replace the legacy server API. Local file linking requires a supported browser and user permission; handles are session-only. Browser data is not a backup or cross-device sync.

Build: `npm ci`, `npm run test:web`, `npm run build`. Vite base defaults to `/app/`; `scripts/build-offline.mjs` generates a versioned service worker precaching the complete build. Deploy only `dist/`. No Express, PostgreSQL, Docker runtime, Python, credentials, or server data are needed. The legacy server sources remain for separate use and are not part of this public deployment.

Caddy strips /app/ and serves its contents. Serve manifest.json as application/manifest+json; sw.js and HTML with no-cache. Scope the PWA to /app/ so it cannot intercept marketing pages. Require HTTPS. Use CSP default-src self, script-src self, connect-src self data: blob:, worker-src self blob:, style-src self unsafe-inline, img-src self data: blob:, font-src self data:, object-src none. No server upload endpoint is provided.

The public edition must use empty src/storage/seedData.js. Never import server/data/*.json into a public bundle. Never deploy .env or source folders. Test synthetic records, not personal projects.

PWA installation depends on browser/device support and policy. It is not an executable installer and does not guarantee the absence of security warnings. Finish the first online load before expecting offline operation. New service worker versions activate when old app windows close.

Changes: residual fetch API controls now local; Excel import previews before replacing only tasks; malformed imports validated before writes; transaction completion awaited; local-file auto-save failures surfaced. Existing utility tests updated to current alphabetic root sort; new local storage and empty-project UI regressions. 101 web tests pass. Legacy server database tests require their separate environment and are excluded from web tests.

SheetJS upgraded to official 0.20.3 distribution. Dependency audit fixes applied. Remaining moderate advisories relate to legacy server uuid and Vitest tools, not deployed app assets; do not expose test/development servers. Large bundle warning is expected for spreadsheet/PDF support.

Review fixes: task cascade reads/writes are atomic; aborted transactions reject; spreadsheet date cells stay numeric until ISO conversion. The legacy IndexedDB database key is retained to preserve existing local data.
