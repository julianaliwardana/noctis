export interface YouTubeResult {
  videoId: string;
  title: string;
  thumbnail: string;
}

// YouTube's public web-client key. Used only for the keyless InnerTube fallback.
// Set via INNERTUBE_KEY env var.
const INNERTUBE_KEY = process.env.INNERTUBE_KEY;
const MAX_RESULTS = 20;

export async function searchYouTube(query: string): Promise<YouTubeResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  return apiKey ? searchViaDataApi(query, apiKey) : searchViaInnerTube(query);
}

interface DataApiResponse {
  items?: {
    id?: { videoId?: string };
    snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
  }[];
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

interface VideoRenderer {
  videoId?: string;
  title?: { runs?: { text?: string }[]; simpleText?: string };
  thumbnail?: { thumbnails?: { url?: string }[] };
}

interface InnerTubeResponse {
  contents?: {
    twoColumnSearchResultsRenderer?: {
      primaryContents?: {
        sectionListRenderer?: {
          contents?: { itemSectionRenderer?: { contents?: { videoRenderer?: VideoRenderer }[] } }[];
        };
      };
    };
  };
}

// could change it. Set YOUTUBE_API_KEY to use the sanctioned Data API instead.
async function searchViaInnerTube(query: string): Promise<YouTubeResult[]> {
  if (!INNERTUBE_KEY) throw new Error("Set YOUTUBE_API_KEY or INNERTUBE_KEY to enable YouTube search");
  const res = await fetch(`https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "en", gl: "US" } },
      query,
    }),
  });
  if (!res.ok) throw new Error(`YouTube search responded ${res.status}`);
  const data = (await res.json()) as InnerTubeResponse;

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
