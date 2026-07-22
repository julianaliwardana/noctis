# YouTube search module

Server-side music/video search that powers the Pomodoro **Music panel**. Given a
query, it returns a normalized list of results (`videoId`, `title`, `thumbnail`,
and — for music — `artist`, `album`, `duration`). The web app plays the returned
`videoId`s in the YouTube IFrame player.

```text
GET /youtube/search?q=<query>&source=video|music     (auth required)
→ YouTubeResult[]
```

## Files

| File | Role |
|------|------|
| `youtube.router.ts` | Fastify route + zod validation of `q` / `source`. |
| `youtube.service.ts` | Fetching + parsing. The only place that talks to YouTube. |
| `youtube.types.ts` | Public `YouTubeResult` contract + the raw response shapes we parse. |
| `youtube.service.test.ts` | `node:test` for `parseMusicItem` (the fragile parser). |
| `youtube.module.ts` | Registers the router under the `/youtube` prefix. |

## Three data sources

`searchYouTube(query, source)` picks a backend:

| Condition | Source | Endpoint | Notes |
|-----------|--------|----------|-------|
| `source === "music"` | **YouTube Music** (`WEB_REMIX`) | `music.youtube.com/youtubei/v1/search` | Rich metadata: artist, album, duration. |
| `YOUTUBE_API_KEY` set | **Data API v3** (official) | `googleapis.com/youtube/v3/search` | Stable, quota-limited, needs a Google key. |
| otherwise | **InnerTube** (`WEB`) | `youtube.com/youtubei/v1/search` | Keyless-ish fallback; no artist/album. |

So video search prefers the sanctioned Data API and falls back to InnerTube;
music search always uses the YT Music InnerTube surface.

### Environment variables

| Var | Used by | Purpose |
|-----|---------|---------|
| `YOUTUBE_API_KEY` | Data API | If present, video search uses the official API. |
| `INNERTUBE_KEY` | InnerTube `WEB` | Public web-client key for the keyless fallback. |
| `INNERTUBE_MUSIC_KEY` | InnerTube `WEB_REMIX` | YT Music's own public key; falls back to `INNERTUBE_KEY`. |

None are secrets in the credential sense — the InnerTube keys are the public keys
baked into youtube.com / music.youtube.com. They live in env so they're easy to
rotate and aren't hardcoded.

## How the data is fetched

Both InnerTube calls go through one helper:

```ts
postInnerTube(url, body)  // POST, JSON body, throws on non-2xx, returns parsed JSON
```

An InnerTube request body always carries a **client context** — InnerTube rejects
requests without one:

```jsonc
{
  "context": { "client": { "clientName": "WEB", "clientVersion": "…", "hl": "en", "gl": "US" } },
  "query": "…",
  "params": "…"   // music only — the "Songs" filter (see below)
}
```

- `clientName` / `clientVersion` mimic the real web player. **A stale
  `clientVersion` is the first thing InnerTube starts rejecting** — bump it if
  search suddenly 400s.
- `params` (music) is a base64 protobuf that pins results to the **Songs** tab.
  Drop it to get mixed results (songs/videos/albums); the parser skips anything
  without a `videoId`, so it degrades gracefully.

## How the data is processed

YouTube returns deeply-nested "renderer" JSON. Each source has its own parser that
walks the nesting and flattens it into `YouTubeResult`.

### Video (`searchViaInnerTube` / `searchViaDataApi`)

Walk to the `videoRenderer` list and pull `videoId`, `title`, `thumbnail`. Capped
at `MAX_RESULTS` (20).

### Music (`searchViaYouTubeMusic` → `parseMusicItem`)

The interesting one. YT Music results are `musicResponsiveListItemRenderer`s:

```text
tabbedSearchResultsRenderer → tabs[0] → … → musicShelfRenderer.contents[]
  └ musicResponsiveListItemRenderer
      ├ flexColumns[0] → title (+ watchEndpoint.videoId fallback)
      ├ flexColumns[1] → "Song • Artist • Album • 3:20"  (runs)
      ├ playlistItemData.videoId
      └ thumbnail.…thumbnails[]   (last = highest res)
```

`parseMusicItem` extracts:

- **videoId** — `playlistItemData.videoId`, else the title run's `watchEndpoint`.
- **title** — first run of `flexColumns[0]`.
- **artist / album / duration** — from `flexColumns[1]`'s runs, after dropping the
  `" • "` separator runs. Because the columns' meaning shifts by result type, it
  uses *heuristics* rather than fixed indices:
  - artist = run whose browse endpoint `pageType` is `MUSIC_PAGE_TYPE_ARTIST`
  - album  = run whose `pageType` is `MUSIC_PAGE_TYPE_ALBUM`
  - duration = run matching `\d{1,2}(:\d{2}){1,2}` (e.g. `3:20`, `1:02:05`)
- **thumbnail** — the largest entry (last in the array) for the now-playing card.

This positional/heuristic parsing is the **fragile part** — see below.

## Developing / extending

- **Add a result category** (albums, artists, playlists): grab that tab's `params`
  blob from DevTools (search on music.youtube.com, click the filter chip, copy the
  `params` field from the `/search` request body) and add a parser for its renderer
  shape.
- **Search breaks (400/403):** first bump `clientVersion`; then verify the InnerTube
  key still matches what the site sends; for music, try setting `INNERTUBE_MUSIC_KEY`
  to YT Music's current public key.
- **Renderer shape drifts** (missing artist/album): update `parseMusicItem` and the
  shapes in `youtube.types.ts`. If it gets unmaintainable, swap to a maintained
  library — [`ytmusicapi`](https://github.com/sigma67/ytmusicapi) (reference for the
  `WEB_REMIX` payloads/params) or [`youtubei.js`](https://github.com/LuanRT/YouTube.js).

## Reference / provenance

None of the InnerTube behavior is officially documented — it's community
reverse-engineering. Ground-truth sources:

- `yt-dlp` — client versions & keys.
- `sigma67/ytmusicapi` — `WEB_REMIX` payloads, the search `params` filters, and the
  `musicResponsiveListItemRenderer` parsing.
- `zerodytrash/YouTube-Internal-Clients` — the `clientName`/`clientVersion`/key combos.

Covers `parseMusicItem` against a minimal song renderer (the piece most likely to
break when YouTube changes its response). The network fetches are intentionally not
mocked — they hit the live, undocumented API and are verified manually.
