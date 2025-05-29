const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

async function fetchEpisodeDetailWithPuppeteer(slug) {
  const maxRetries = 3;
  const retryDelayMs = 1000;
  let lastError = null;
  const url = `https://154.26.137.28/${slug}/`;

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
      lastError = err;
      console.warn(
        `Attempt ${attempt} to fetch episode "${slug}" failed: ${err.message}`
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

  console.error(
    `All ${maxRetries} attempts failed for episode slug: ${slug}`,
    lastError
  );
  return {
    slug,
    title: null,
    episode_number: null,
    mirrors: [],
    source_url: url,
  };
}

module.exports = {
  fetchEpisodeDetailWithPuppeteer,
};
