
const CHANNEL_HANDLE = "@mwmbl";

async function getVideoCount() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    return queryApiForVideoCount();
  } else {
    return scrapeVideoCount();
  }
}

/**
 * Gets the YouTube video count by scraping the channel's videos page.
 * @returns {Promise<number>} The number of videos on the YouTube channel.
 */
async function scrapeVideoCount() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    throw new Error("Refusing to scrape, API key is configured.");
  }

  console.warn("WARNING: Scraping YouTube video count. Please use an API key instead!");

  const response = await fetch(
    `https://www.youtube.com/${CHANNEL_HANDLE}/videos`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
    }
  );

  if (!response.ok) {n
    throw new Error(`YouTube scrape failed: HTTP ${response.status}`);
  }

  const html = await response.text();

  // YouTube's page metadata can change, so keep this
  // regex isolated to the scraping implementation.
  const patterns = [
    /"videoCountText":\{"runs":\[\{"text":"([\d,]+)"/,
    /"([\d,]+) videos"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return Number(match[1].replace(/,/g, ""));
  }

  throw new Error("Could not find YouTube video count");
}

/**
 * Gets the YouTube video count via the YouTube API.
 * @returns {Promise<number>} The number of videos on the YouTube channel.
 */
async function queryApiForVideoCount() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }

  const url = new URL(
    "https://www.googleapis.com/youtube/v3/channels"
  );

  url.searchParams.set("part", "statistics");
  url.searchParams.set("forHandle", CHANNEL_HANDLE);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube API failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const count = data.items?.[0]?.statistics?.videoCount;

  if (count === undefined) {
    throw new Error("YouTube channel not found");
  }

  return Number(count);
}

export const youtube = {
  scrapeVideoCount,
  getVideoCount,
};
