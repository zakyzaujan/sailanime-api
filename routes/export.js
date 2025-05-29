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

/**
 * GET /export/anime-episodes.csv
 *   – Setiap baris: satu episode untuk setiap anime
 *   – Kolom: id, anime_nama, episode_number, episode_title, episode_href, mirrors
 */
router.get("/anime-episodes.csv", async (req, res) => {
  try {
    let animeList = getCachedAnimeList();
    if (!animeList) {
      animeList = await fetchAnimeListWithPuppeteer();
      setCachedAnimeList(animeList);
    }

    if (!animeList || animeList.length === 0) {
      return res.status(404).send("Tidak ada data anime untuk diekspor.");
    }

    const filename = "anime-episodes.csv";
    const filepath = csvFilePath(filename);

    if (csvFileExists(filename) && isCSVFresh(filename, CSV_TTL_MS)) {
      res.header("Content-Type", "text/csv");
      res.attachment(filename);
      return res.sendFile(filepath);
    }

    console.log(
      `File '${filename}' tidak ada atau sudah kedaluwarsa → generate ulang seluruh daftar episode.`
    );

    const allRows = [];

    const ANIME_CONCURRENCY = 3;
    await pMap(
      animeList,
      async (animeMeta) => {
        let detail;
        try {
          detail = await fetchAnimeDetailWithPuppeteer(animeMeta.url);
        } catch (e) {
          console.error(
            `Gagal fetch detail anime ID ${animeMeta.id}: ${e.message}`
          );
          return;
        }

        if (!detail.episodes || detail.episodes.length === 0) {
          console.warn(
            `Anime ID ${animeMeta.id} (${animeMeta.nama}) tidak memiliki episodes.`
          );
          return;
        }

        const EP_CONCURRENCY = 3;
        await pMap(
          detail.episodes,
          async (epObj, idx) => {
            const match = epObj.title.match(/Episode\s+(\d+)/i);
            const episode_number = match ? parseInt(match[1], 10) : idx + 1;
            const episode_href = epObj.href.trim();

            const hrefPath = new URL(episode_href, "https://154.26.137.28")
              .pathname;
            const slug = hrefPath.replace(/^\/+|\/+$/g, "");

            let epDetail;
            try {
              epDetail = await fetchEpisodeDetailWithPuppeteer(slug);
            } catch (e) {
              console.error(
                `Gagal fetch detail episode slug="${slug}": ${e.message}`
              );
              epDetail = {
                title: "",
                episode_number: episode_number,
                mirrors: [],
                source_url: episode_href,
              };
            }

            const episode_title = epDetail.title
              ? epDetail.title.trim()
              : epObj.title.trim();

            let mirrorsSerialized = "";
            try {
              mirrorsSerialized = JSON.stringify(epDetail.mirrors || []);
            } catch {
              mirrorsSerialized = "[]";
            }

            allRows.push({
              id: animeMeta.id,
              anime_nama: animeMeta.nama,
              episode_number,
              episode_title,
              episode_href,
              mirrors: mirrorsSerialized,
            });
          },
          { concurrency: EP_CONCURRENCY }
        );
      },
      { concurrency: ANIME_CONCURRENCY }
    );

    const fields = [
      "id",
      "anime_nama",
      "episode_number",
      "episode_title",
      "episode_href",
      "mirrors",
    ];
    generateAndSaveCSV(allRows, fields, filename);

    res.header("Content-Type", "text/csv");
    res.attachment(filename);
    return res.sendFile(filepath);
  } catch (err) {
    console.error("Error export anime-episodes.csv:", err);
    return res.status(500).send("Gagal membuat CSV daftar episode anime.");
  }
});

module.exports = router;
