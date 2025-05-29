const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

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

module.exports = {
  fetchAnimeListWithPuppeteer,
};
