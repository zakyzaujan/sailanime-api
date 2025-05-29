const express = require("express");
const router = express.Router();

const { getCachedAnimeList, setCachedAnimeList } = require("../utils/cache");
const { fetchAnimeListWithPuppeteer } = require("../scrapers/animeList");
const { fetchAnimeDetailWithPuppeteer } = require("../scrapers/animeDetail");

// GET /api/anime
router.get("/", async (req, res) => {
  try {
    let animeList = getCachedAnimeList();
    if (!animeList) {
      animeList = await fetchAnimeListWithPuppeteer();
      setCachedAnimeList(animeList);
    }
    return res.json({
      success: true,
      count: animeList.length,
      data: animeList,
    });
  } catch (err) {
    console.error("Error di GET /api/anime:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Gagal mengambil daftar anime." });
  }
});

// GET /api/anime/:id
router.get("/:id", async (req, res) => {
  const idParam = parseInt(req.params.id, 10);
  if (isNaN(idParam)) {
    return res
      .status(400)
      .json({ success: false, message: "ID harus berupa angka." });
  }

  try {
    let animeList = getCachedAnimeList();
    if (!animeList) {
      animeList = await fetchAnimeListWithPuppeteer();
      setCachedAnimeList(animeList);
    }

    const animeMeta = animeList.find((a) => a.id === idParam);
    if (!animeMeta) {
      return res
        .status(404)
        .json({ success: false, message: "Anime tidak ditemukan." });
    }

    const detail = await fetchAnimeDetailWithPuppeteer(animeMeta.url);
    const result = {
      id: animeMeta.id,
      nama: animeMeta.nama,
      url: animeMeta.url,
      thumbnail: detail.thumbnail,
      alternatif: detail.alternatif,
      tipe: detail.tipe,
      jumlah_episode: detail.jumlah_episode,
      skor: detail.skor,
      genre: detail.genre,
      status: detail.status,
      studio: detail.studio,
      dirilis: detail.dirilis,
      musim: detail.musim,
      sinopsis: detail.sinopsis,
      episodes: detail.episodes,
    };

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error di GET /api/anime/:id:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Gagal mengambil detail anime." });
  }
});

module.exports = router;
