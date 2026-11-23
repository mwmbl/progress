
const CHANNEL_HANDLE = "@mwmbl";
const SEARCH_QUERY = "mwmbl";

/**
 * Gets the number of unique YouTube videos associated with Mwmbl.
 *
 * Includes all official channel uploads and search results
 * whose titles contain "mwmbl".
 *
 * @returns {Promise<number>}
 */
async function getVideoCount() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }

  const [channelVideoIds, searchVideoIds] = await Promise.all([
    getChannelVideoIds(apiKey),
    searchForMwmblVideoIds(apiKey),
  ]);

  return new Set([...channelVideoIds, ...searchVideoIds]).size;
}

/**
 * Gets all video IDs uploaded by the official Mwmbl channel.
 *
 * @param {string} apiKey
 * @returns {Promise<string[]>}
 */
async function getChannelVideoIds(apiKey) {
  const url = new URL(
    "https://www.googleapis.com/youtube/v3/channels"
  );

  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("forHandle", CHANNEL_HANDLE);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube API failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const uploadsPlaylistId =
    data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("YouTube channel not found");
  }

  const videoIds = [];
  let nextPageToken;

  do {
    const playlistUrl = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems"
    );

    playlistUrl.searchParams.set("part", "contentDetails");
    playlistUrl.searchParams.set("playlistId", uploadsPlaylistId);
    playlistUrl.searchParams.set("maxResults", "50");
    playlistUrl.searchParams.set("key", apiKey);

    if (nextPageToken) {
      playlistUrl.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(playlistUrl);

    if (!response.ok) {
      throw new Error(`YouTube API failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    videoIds.push(
      ...(data.items ?? []).map(
        (item) => item.contentDetails.videoId
      )
    );

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return videoIds;
}

/**
 * Searches YouTube for videos matching Mwmbl.
 * Only includes results whose titles contain "mwmbl".
 *
 * @param {string} apiKey
 * @returns {Promise<string[]>}
 */
async function searchForMwmblVideoIds(apiKey) {
  const videoIds = [];
  let nextPageToken;

  do {
    const url = new URL(
      "https://www.googleapis.com/youtube/v3/search"
    );

    url.searchParams.set("part", "id");
    url.searchParams.set("type", "video");
    url.searchParams.set("q", SEARCH_QUERY);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);

    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`YouTube API failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    const pageVideoIds = (data.items ?? [])
      .map((item) => item.id.videoId)
      .filter(Boolean);

    const videos = await getVideoDetails(apiKey, pageVideoIds);

    videoIds.push(
      ...videos
        .filter((video) => /mwmbl/i.test(video.title))
        .map((video) => video.id)
    );

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  /**
   * NOTE: Uncomment the line below to see video details.
   * console.table(videos);
   */

  return videoIds;
}

/**
 * Gets video metadata for a list of IDs.
 *
 * @param {string} apiKey
 * @param {string[]} videoIds
 * @returns {Promise<Array<{id: string, title: string, channel: string}>>}
 */
async function getVideoDetails(apiKey, videoIds) {
  if (videoIds.length === 0) {
    return [];
  }

  const url = new URL(
    "https://www.googleapis.com/youtube/v3/videos"
  );

  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube API failed: HTTP ${response.status}`);
  }

  const data = await response.json();

  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
  }));
}

export const youtube = {
  getVideoCount,
};
