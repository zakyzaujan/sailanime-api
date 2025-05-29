const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

async function fetchAnimeDetailWithPuppeteer(url) {
  const maxRetries = 3;
  const retryDelayMs = 1000;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let browser = null;
    let page = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      page = await browser.newPage();

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
        episodes: [],
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
      if (thumb) info.thumbnail = thumb;

      $("ul.daftar li a").each((_, aElem) => {
        const title = $(aElem).text().trim();
        const href = $(aElem).attr("href").trim();
        info.episodes.push({ title, href });
      });

      return info;
    } catch (err) {
      lastError = err;
      console.warn(
        `Attempt ${attempt} to fetch detail "${url}" failed: ${err.message}`
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (_) {}
      }
      if (browser) {
        try {
          await browser.close();
        } catch (_) {}
      }
    }
  }

  console.error(`All ${maxRetries} attempts failed for URL: ${url}`, lastError);
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
}

module.exports = {
  fetchAnimeDetailWithPuppeteer,
};
