import type {
  DataApiResponse,
  InnerTubeResponse,
  MusicListItem,
  MusicSearchResponse,
  SearchSource,
  YouTubeResult,
} from "./youtube.types";

export type { SearchSource, YouTubeResult } from "./youtube.types";

const INNERTUBE_KEY = process.env.INNERTUBE_KEY;
const INNERTUBE_MUSIC_KEY = process.env.INNERTUBE_MUSIC_KEY ?? INNERTUBE_KEY;
const MAX_RESULTS = 20;

export async function searchYouTube(
  query: string,
  source: SearchSource = "video",
): Promise<YouTubeResult[]> {
  if (source === "music") return searchViaYouTubeMusic(query);
  const apiKey = process.env.YOUTUBE_API_KEY;
  return apiKey ? searchViaDataApi(query, apiKey) : searchViaInnerTube(query);
}

// POST to an InnerTube endpoint (the private JSON API youtube.com/music.youtube.com use).
async function postInnerTube<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`InnerTube responded ${res.status} for ${new URL(url).host}`);
  return res.json() as Promise<T>;
}

async function searchViaDataApi(query: string, apiKey: string): Promise<YouTubeResult[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube Data API responded ${res.status}`);
  const data = (await res.json()) as DataApiResponse;
  return (data.items ?? []).flatMap((item) => {
    const videoId = item.id?.videoId;
    if (!videoId) return [];
    return [
      {
        videoId,
        title: item.snippet?.title ?? "",
        thumbnail: item.snippet?.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${videoId}/default.jpg`,
      },
    ];
  });
}

// Keyless fallback via the private web-client API. Set YOUTUBE_API_KEY to use the
// sanctioned Data API instead; this shape can change without notice.
async function searchViaInnerTube(query: string): Promise<YouTubeResult[]> {
  if (!INNERTUBE_KEY) throw new Error("Set YOUTUBE_API_KEY or INNERTUBE_KEY to enable YouTube search");
  const data = await postInnerTube<InnerTubeResponse>(
    `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`,
    {
      context: { client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "en", gl: "US" } },
      query,
    },
  );

  const sections =
    data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];
  const results: YouTubeResult[] = [];
  for (const section of sections) {
    for (const entry of section.itemSectionRenderer?.contents ?? []) {
      const video = entry.videoRenderer;
      if (!video?.videoId) continue;
      results.push({
        videoId: video.videoId,
        title: video.title?.runs?.[0]?.text ?? video.title?.simpleText ?? "",
        thumbnail: video.thumbnail?.thumbnails?.[0]?.url ?? `https://i.ytimg.com/vi/${video.videoId}/default.jpg`,
      });
      if (results.length >= MAX_RESULTS) return results;
    }
  }
  return results;
}

// --- YouTube Music (WEB_REMIX) -------------------------------------------------

const DURATION_RE = /^\d{1,2}(:\d{2}){1,2}$/;

async function searchViaYouTubeMusic(query: string): Promise<YouTubeResult[]> {
  if (!INNERTUBE_MUSIC_KEY)
    throw new Error("Set INNERTUBE_MUSIC_KEY or INNERTUBE_KEY to enable YouTube Music search");
  const data = await postInnerTube<MusicSearchResponse>(
    `https://music.youtube.com/youtubei/v1/search?key=${INNERTUBE_MUSIC_KEY}`,
    {
      context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20240101.01.00", hl: "en", gl: "US" } },
      // Filter to song results only (the "Songs" tab of a YT Music search).
      params: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D",
      query,
    },
  );

  const sections =
    data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ?? [];
  const results: YouTubeResult[] = [];
  for (const section of sections) {
    for (const entry of section.musicShelfRenderer?.contents ?? []) {
      const item = entry.musicResponsiveListItemRenderer;
      const parsed = item && parseMusicItem(item);
      if (parsed) results.push(parsed);
      if (results.length >= MAX_RESULTS) return results;
    }
  }
  return results;
}

// into runs by result type, so heuristics (browse endpoint types + duration regex)
// beat fixed indices. Swap to ytmusicapi/youtubei.js if the shape drifts.
export function parseMusicItem(item: MusicListItem): YouTubeResult | null {
  const cols = item.flexColumns ?? [];
  const titleRuns = cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];
  const title = titleRuns[0]?.text ?? "";
  const videoId =
    item.playlistItemData?.videoId ?? titleRuns[0]?.navigationEndpoint?.watchEndpoint?.videoId;
  if (!videoId || !title) return null;

  const subRuns = (cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? []).filter(
    (musicRun) => musicRun.text && musicRun.text !== " • ",
  );
  let artist: string | undefined;
  let album: string | undefined;
  let duration: string | undefined;
  for (const run of subRuns) {
    const pageType =
      run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs
        ?.browseEndpointContextMusicConfig?.pageType;
    if (pageType === "MUSIC_PAGE_TYPE_ARTIST" && !artist) artist = run.text;
    else if (pageType === "MUSIC_PAGE_TYPE_ALBUM" && !album) album = run.text;
    else if (run.text && DURATION_RE.test(run.text)) duration = run.text;
  }

  const thumbs = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
  return {
    videoId,
    title,
    artist,
    album,
    duration,
    // Last entry is the highest resolution — used for the now-playing card.
    thumbnail: thumbs[thumbs.length - 1]?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}
