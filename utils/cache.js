let cachedAnimeList = null;
let cachedAnimeListTimestamp = 0;

const ANIME_LIST_TTL_MS = 1000 * 60 * 60 * 24;

function isAnimeListCacheValid() {
  if (!cachedAnimeList) return false;
  const age = Date.now() - cachedAnimeListTimestamp;
  return age < ANIME_LIST_TTL_MS;
}

function getCachedAnimeList() {
  if (isAnimeListCacheValid()) {
    return cachedAnimeList;
  } else {
    cachedAnimeList = null;
    cachedAnimeListTimestamp = 0;
    return null;
  }
}

function setCachedAnimeList(list) {
  cachedAnimeList = list;
  cachedAnimeListTimestamp = Date.now();
}

module.exports = {
  getCachedAnimeList,
  setCachedAnimeList,
  ANIME_LIST_TTL_MS,
};
