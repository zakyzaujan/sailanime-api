const express = require("express");
const router = express.Router();

const { getCachedAnimeList, setCachedAnimeList } = require("../utils/cache");
const { fetchAnimeListWithPuppeteer } = require("../scrapers/animeList");
const { fetchAnimeDetailWithPuppeteer } = require("../scrapers/animeDetail");
const {
  fetchEpisodeDetailWithPuppeteer,
} = require("../scrapers/episodeDetail");

// GET /api/anime/:id/:episodeNumber
router.get("/:id/:episodeNumber", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const episodeNumber = parseInt(req.params.episodeNumber, 10);

  if (isNaN(id) || isNaN(episodeNumber)) {
    return res.status(400).json({
      success: false,
      message: "ID dan nomor episode harus berupa angka.",
    });
  }

  try {
    let animeList = getCachedAnimeList();
    if (!animeList) {
      animeList = await fetchAnimeListWithPuppeteer();
      setCachedAnimeList(animeList);
    }

    const animeMeta = animeList.find((a) => a.id === id);
    if (!animeMeta) {
      return res
        .status(404)
        .json({ success: false, message: "Anime tidak ditemukan." });
    }

    const detail = await fetchAnimeDetailWithPuppeteer(animeMeta.url);
    const episodes = detail.episodes.map((ep, idx) => {
      const match = ep.title.match(/Episode\s+(\d+)/i);
      const number = match ? parseInt(match[1], 10) : idx + 1;
      return { ...ep, number };
    });

    if (episodeNumber < 1 || episodeNumber > episodes.length) {
      return res
        .status(404)
        .json({ success: false, message: "Episode tidak ditemukan." });
    }

    const episode = episodes.find((ep) => ep.number === episodeNumber);
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: `Episode ${episodeNumber} tidak ditemukan untuk anime ID ${id}.`,
      });
    }

    const hrefPath = new URL(episode.href, "https://154.26.137.28").pathname;
    const slug = hrefPath.replace(/^\/+|\/+$/g, "");

    const episodeDetail = await fetchEpisodeDetailWithPuppeteer(slug);

    return res.json({
      success: true,
      data: episodeDetail,
    });
  } catch (err) {
    console.error("Error di GET /api/anime/:id/:episodeNumber:", err.message);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail episode dari anime tersebut.",
    });
  }
});

module.exports = router;
