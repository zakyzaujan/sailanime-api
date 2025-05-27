const express = require("express");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const app = express();
const PORT = 5000;

let cachedAnimeList = null;

async function fetchAnimeListWithPuppeteer() {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/114.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;" +
        "q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto("https://154.26.137.28/anime/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.waitForSelector("a.series", { timeout: 15000 });

    const html = await page.content();
    const $ = cheerio.load(html);
    const animeList = [];

    $("div.blix").each((_, divElem) => {
      const spanA = $(divElem).find("span a[name]").first();
      if (!spanA.length) return;
      const groupName = spanA.attr("name").trim();

      $(divElem)
        .find("a.series")
        .each((_, aElem) => {
          const nama = $(aElem).text().trim();
          const url = $(aElem).attr("href").trim();
          animeList.push({
            id: animeList.length + 1,
            group: groupName,
            nama,
            url,
          });
        });
    });

    return animeList;
  } catch (err) {
    console.error("Error fetchAnimeListWithPuppeteer():", err.message);
    return [];
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
  }
}

async function getAnimeList() {
  if (cachedAnimeList) return cachedAnimeList;
  cachedAnimeList = await fetchAnimeListWithPuppeteer();
  return cachedAnimeList;
}

app.get("/api/anime", async (req, res) => {
  try {
    const animeList = await getAnimeList();
    res.json({
      success: true,
      count: animeList.length,
      data: animeList,
    });
  } catch (err) {
    console.error("Error di /api/anime:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Gagal mengambil daftar anime" });
  }
});

async function fetchAnimeDetailWithPuppeteer(url) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/114.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;" +
        "q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("table tr", { timeout: 15000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    const info = {
      thumbnail: null,
      alternatif: null,
      tipe: null,
      jumlah_episode: null,
      skor: null,
      genre: [],
      status: null,
      studio: null,
      dirilis: null,
      musim: null,
      sinopsis: null,
    };

    $("table tr").each((_, trElem) => {
      const thText = $(trElem).find("th").text().trim().replace(/:$/, "");
      const tdElem = $(trElem).find("td");
      const label = thText.toLowerCase();

      switch (label) {
        case "alternatif":
          info.alternatif = tdElem.text().trim();
          break;
        case "tipe":
          info.tipe = tdElem.text().trim();
          break;
        case "jumlah episode":
          info.jumlah_episode = tdElem.text().trim();
          break;
        case "skor anime":
          info.skor = tdElem.text().trim();
          break;
        case "genre":
          tdElem.find("a").each((_, a) => {
            const genreName = $(a).text().trim();
            if (genreName) info.genre.push(genreName);
          });
          break;
        case "status":
          info.status = tdElem.text().trim();
          break;
        case "studio":
          tdElem.find("a").each((_, a) => {
            const studioName = $(a).text().trim();
            if (studioName) info.studio = studioName;
          });
          break;
        case "dirilis":
          info.dirilis = tdElem.text().trim();
          break;
        case "musim":
          info.musim = tdElem.text().trim();
          break;
        default:
          break;
      }
    });

    const sinopsisParts = $(".entry-content p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(
        (text) =>
          text.length > 30 &&
          !/tonton streaming|download gratis|animesail|jadwal update|orang hebat|fansub/i.test(
            text
          )
      );

    if (sinopsisParts.length) {
      info.sinopsis = sinopsisParts.join("\n\n");
    }

    const thumb = $('meta[property="og:image"]').attr("content");
    if (thumb) {
      info.thumbnail = thumb;
    }

    const episodes = [];
    $("ul.daftar li a").each((_, aElem) => {
      const title = $(aElem).text().trim();
      const href = $(aElem).attr("href").trim();
      episodes.push({ title, href });
    });

    return {
      ...info,
      episodes,
    };
  } catch (err) {
    console.error("Error fetchAnimeDetailWithPuppeteer():", err.message);
    return {
      thumbnail: null,
      alternatif: null,
      tipe: null,
      jumlah_episode: null,
      skor: null,
      genre: [],
      status: null,
      studio: null,
      dirilis: null,
      musim: null,
      sinopsis: null,
      episodes: [],
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
  }
}

app.get("/api/anime/:id", async (req, res) => {
  const idParam = parseInt(req.params.id, 10);
  if (isNaN(idParam)) {
    return res.status(400).json({ success: false, message: "ID tidak valid." });
  }

  try {
    const animeList = await getAnimeList();
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
    console.error("Error di /api/anime/:id:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Gagal mengambil detail anime." });
  }
});

async function fetchEpisodeDetailWithPuppeteer(slug) {
  const url = `https://154.26.137.28/${slug}/`;
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/114.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;" +
        "q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector(".entry-content", { timeout: 15000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    const title = $("h1.entry-title").first().text().trim();
    const episodeMatch = title.match(/Episode\s+(\d+)/i);
    const episode_number = episodeMatch ? episodeMatch[1] : null;

    const mirrors = [];
    $("select.mirror option[data-em]").each((_, opt) => {
      const label = $(opt).text().trim();
      const dataEm = $(opt).attr("data-em") || "";
      let embedHtml = "";
      try {
        embedHtml = Buffer.from(dataEm, "base64").toString("utf8");
      } catch {
        embedHtml = "";
      }
      mirrors.push({ label, embedHtml });
    });

    return {
      slug,
      title,
      episode_number,
      mirrors,
      source_url: url,
    };
  } catch (err) {
    console.error(
      `Error fetchEpisodeDetailWithPuppeteer("${slug}"):`,
      err.message
    );
    return {
      slug,
      title: null,
      episode_number: null,
      mirrors: [],
      sinopsis: "",
      fansub: "",
      source_url: url,
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
  }
}

app.get("/api/anime/:id/:episodeNumber", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const episodeNumber = parseInt(req.params.episodeNumber, 10);

  if (isNaN(id) || isNaN(episodeNumber)) {
    return res.status(400).json({
      success: false,
      message: "ID dan nomor episode harus berupa angka.",
    });
  }

  try {
    const animeList = await getAnimeList();
    const animeMeta = animeList.find((a) => a.id === id);
    if (!animeMeta) {
      return res
        .status(404)
        .json({ success: false, message: "Anime tidak ditemukan." });
    }

    const detail = await fetchAnimeDetailWithPuppeteer(animeMeta.url);

    const episodes = detail.episodes.map((ep, idx) => {
      const match = ep.title.match(/Episode\s+(\d+)/i);
      const number = match ? parseInt(match[1]) : idx + 1;
      return { ...ep, number };
    });
    ``;

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
    console.error("Error di /api/anime/:id/:episodeNumber:", err.message);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail episode dari anime tersebut.",
    });
  }
});

app.get("/", (req, res) => {
  res.send(`
  <pre>
  GET  /api/anime               -> daftar semua anime.
  GET  /api/anime/:id           -> detail untuk satu anime.
  GET  /api/anime/:id/:episode  -> detail satu episode.
  </pre>
    `);
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
