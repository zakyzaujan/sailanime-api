const express = require("express");
const router = express.Router();
const pMap = require("p-map");

const { getCachedAnimeList, setCachedAnimeList } = require("../utils/cache");
const { fetchAnimeListWithPuppeteer } = require("../scrapers/animeList");
const { fetchAnimeDetailWithPuppeteer } = require("../scrapers/animeDetail");
const {
  generateAndSaveCSV,
  csvFileExists,
  csvFilePath,
  isCSVFresh,
} = require("../utils/csvHelper");

const CSV_TTL_MS = 1000 * 60 * 60 * 24;

// GET /export/anime-list.csv
router.get("/anime-list.csv", async (req, res) => {
  try {
    let animeList = getCachedAnimeList();
    if (!animeList) {
      animeList = await fetchAnimeListWithPuppeteer();
      setCachedAnimeList(animeList);
    }
    if (!animeList || animeList.length === 0) {
      return res.status(404).send("Belum ada data anime.");
    }

    const filename = "anime-list.csv";
    const filepath = csvFilePath(filename);

    if (csvFileExists(filename) && isCSVFresh(filename, CSV_TTL_MS)) {
      res.header("Content-Type", "text/csv");
      res.attachment(filename);
      return res.sendFile(filepath);
    }

    const rows = animeList.map((a) => ({
      id: a.id,
      group: a.group,
      nama: a.nama,
      url: a.url,
    }));

    generateAndSaveCSV(rows, ["id", "group", "nama", "url"], filename);
    res.header("Content-Type", "text/csv");
    res.attachment(filename);
    return res.sendFile(filepath);
  } catch (err) {
    console.error("Error export anime-list.csv:", err);
    return res.status(500).send("Gagal membuat CSV daftar anime.");
  }
});

/**
 * GET /export/anime-list-detail.csv
 * → detail tiap anime (tanpa daftar episode)
 * jalankan scraping detail anime secara concurrent,
 * agar tidak diblocking serial 1 per 1.
 */
router.get("/anime-list-detail.csv", async (req, res) => {
  try {
    let animeList = getCachedAnimeList();
    if (!animeList) {
      animeList = await fetchAnimeListWithPuppeteer();
      setCachedAnimeList(animeList);
    }
    if (!animeList || animeList.length === 0) {
      return res.status(404).send("Tidak ada data anime untuk diekspor.");
    }

    const filename = "anime-list-detail.csv";
    const filepath = csvFilePath(filename);

    if (csvFileExists(filename) && isCSVFresh(filename, CSV_TTL_MS)) {
      res.header("Content-Type", "text/csv");
      res.attachment(filename);
      return res.sendFile(filepath);
    }

    console.log(
      `CSV '${filename}' tidak ada atau expired → mulai generate baru.`
    );

    const CONCURRENCY = 5;

    const rows = [];

    await pMap(
      animeList,
      async (animeMeta, index) => {
        try {
          const detail = await fetchAnimeDetailWithPuppeteer(animeMeta.url);
          return {
            id: animeMeta.id,
            nama: animeMeta.nama,
            url: animeMeta.url,
            thumbnail: detail.thumbnail || "",
            alternatif: detail.alternatif || "",
            tipe: detail.tipe || "",
            jumlah_episode: detail.jumlah_episode || "",
            skor: detail.skor || "",
            genre: (detail.genre || []).join(";"),
            status: detail.status || "",
            studio: detail.studio || "",
            dirilis: detail.dirilis || "",
            musim: detail.musim || "",
            sinopsis: detail.sinopsis
              ? detail.sinopsis.replace(/\r?\n/g, " ")
              : "",
          };
        } catch (err) {
          console.error(
            `Gagal fetch detail anime ID ${animeMeta.id}, URL=${animeMeta.url}:`,
            err.message
          );
          return {
            id: animeMeta.id,
            nama: animeMeta.nama,
            url: animeMeta.url,
            thumbnail: "",
            alternatif: "",
            tipe: "",
            jumlah_episode: "",
            skor: "",
            genre: "",
            status: "",
            studio: "",
            dirilis: "",
            musim: "",
            sinopsis: "",
          };
        }
      },
      { concurrency: CONCURRENCY }
    ).then((results) => {
      results.forEach((r) => rows.push(r));
    });

    const fields = [
      "id",
      "nama",
      "url",
      "thumbnail",
      "alternatif",
      "tipe",
      "jumlah_episode",
      "skor",
      "genre",
      "status",
      "studio",
      "dirilis",
      "musim",
      "sinopsis",
    ];
    generateAndSaveCSV(rows, fields, filename);

    res.header("Content-Type", "text/csv");
    res.attachment(filename);
    return res.sendFile(filepath);
  } catch (err) {
    console.error("Error export anime-list-detail.csv:", err);
    return res.status(500).send("Gagal menghasilkan CSV detail semua anime.");
  }
});

module.exports = router;
