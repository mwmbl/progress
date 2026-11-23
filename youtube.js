
const CHANNEL_HANDLE = "@mwmbl";
const SEARCH_QUERY = "mwmbl";

/**
 * Gets the number of unique YouTube videos associated with Mwmbl.
 *
 * Includes videos uploaded by the official Mwmbl channel and videos
 * returned by a YouTube search for "mwmbl".
 *
 * @returns {Promise<number>} The number of unique videos.
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

  console.log(JSON.stringify(searchVideoIds))

  return new Set([...channelVideoIds, ...searchVideoIds]).size;
}

/**
 * Gets all video IDs uploaded by the official Mwmbl channel.
 *
 * @param {string} apiKey
 * @returns {Promise<string[]>}
 */
async function getChannelVideoIds(apiKey) {
  const channelUrl = new URL(
    "https://www.googleapis.com/youtube/v3/channels"
  );

  channelUrl.searchParams.set("part", "contentDetails");
  channelUrl.searchParams.set("forHandle", CHANNEL_HANDLE);
  channelUrl.searchParams.set("key", apiKey);

  const channelResponse = await fetch(channelUrl);

  if (!channelResponse.ok) {
    throw new Error(`YouTube API failed: HTTP ${channelResponse.status}`);
  }

  const channelData = await channelResponse.json();
  const uploadsPlaylistId =
    channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

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
    
    getVideoDetails();

    videoIds.push(
      ...(data.items ?? []).map((item) => item.id.videoId)
    );

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return videoIds;
}

export const youtube = {
  getVideoCount,
};


const VIDEO_IDS = [
  "8FPWDlk-Fsk", "2SALX4RgfuU", "-x9MtadE9wY",
  "pGRY7kkKw-s", "53sYMXplgyQ", "bLc5qkHUUJY",
  "2VVwmkOEuMY", "Fd0-EMJbRWc", "ZQcN7ImqAXQ",
  "-ATk69Oet3s", "DBUOaHyj254", "tuoexQccCk8",
  "Q130KKaeTLw", "EFiRLrdk1vE", "WmYDucHvQIk",
  "4FaoQhYeeDE", "mo5jWDOKhO8", "1FHN1UJsPIk",
  "wdXC3PAJRD0", "ikYVNKh6OuI", "vPl7_lT6rKM",
  "GzgEMM-yBdI", "kW1rgVHmTeU", "MwMBl-gHmfU",
  "MwMBL-71Py0", "MWmBL-VoIiY", "mWmBl-M1Q-Y",
  "8L-Mwmbl-XE", "ipl-mwmBL-A", "MwMbL-on0A0",
  "mwmBl-9zFSk", "MWMbL-EpiVY", "LQ-mwmBl-bY",
  "7VR6Wvdls_E", "uMRD2zX2qcc", "mWmBl-qvLpY",
  "EM1OOL9xJw8", "I9Ow2l-2v2I", "MWmbl-HdErk",
  "mwMBL-TQQjk", "MwmBl-TUfUI", "mwmbL-kC6Vk",
  "mwMBl-6lQYI", "mwmbL-WRLiA", "l0S4QDHctsM",
];

async function getVideoDetails() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }

  const url = new URL(
    "https://www.googleapis.com/youtube/v3/videos"
  );

  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", VIDEO_IDS.join(","));
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube API failed: HTTP ${response.status}`);
  }

  const data = await response.json();

  const videos = new Map(
    data.items.map((item) => [
      item.id,
      {
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
      },
    ])
  );

  return VIDEO_IDS.map((id) => ({
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: videos.get(id)?.title ?? "Unavailable",
    channel: videos.get(id)?.channel ?? null,
  }));
}

const videos = await getVideoDetails();

console.table(videos);