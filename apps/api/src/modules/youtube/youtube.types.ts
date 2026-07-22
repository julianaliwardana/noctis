export interface YouTubeResult {
  videoId: string;
  title: string;
  thumbnail: string;
  artist?: string;
  album?: string;
  duration?: string;
}

export type SearchSource = "video" | "music";

// --- YouTube Data API v3 -------------------------------------------------------

export interface DataApiResponse {
  items?: {
    id?: { videoId?: string };
    snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
  }[];
}

// --- YouTube search (WEB / InnerTube) ------------------------------------------

export interface VideoRenderer {
  videoId?: string;
  title?: { runs?: { text?: string }[]; simpleText?: string };
  thumbnail?: { thumbnails?: { url?: string }[] };
}

export interface InnerTubeResponse {
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

// --- YouTube Music (WEB_REMIX) -------------------------------------------------

export interface MusicRun {
  text?: string;
  navigationEndpoint?: {
    watchEndpoint?: { videoId?: string };
    browseEndpoint?: { browseId?: string; browseEndpointContextSupportedConfigs?: { browseEndpointContextMusicConfig?: { pageType?: string } } };
  };
}

export interface MusicFlexColumn {
  musicResponsiveListItemFlexColumnRenderer?: { text?: { runs?: MusicRun[] } };
}

export interface MusicListItem {
  flexColumns?: MusicFlexColumn[];
  playlistItemData?: { videoId?: string };
  thumbnail?: { musicThumbnailRenderer?: { thumbnail?: { thumbnails?: { url?: string }[] } } };
}

export interface MusicShelf {
  musicShelfRenderer?: { contents?: { musicResponsiveListItemRenderer?: MusicListItem }[] };
}

export interface MusicSearchResponse {
  contents?: {
    tabbedSearchResultsRenderer?: {
      tabs?: { tabRenderer?: { content?: { sectionListRenderer?: { contents?: MusicShelf[] } } } }[];
    };
  };
}
