const express = require("express");
const app = express();
const PORT = 5000;

const animeRouter = require("./routes/anime");
const exportRouter = require("./routes/export");
const episodeRouter = require("./routes/episode");

app.use("/api/anime", animeRouter);
app.use("/export", exportRouter);
app.use("/api/anime", episodeRouter);

app.get("/", (req, res) => {
  res.send(`
  <pre>
  GET  /api/anime                      -> daftar semua anime.
  GET  /api/anime/:id                  -> detail satu anime.
  GET  /api/anime/:id/:episode         -> detail satu episode (embed/mirror).
  
  GET  /export/anime-list.csv          -> CSV: id, group, nama, url.
  GET  /export/anime-list-detail.csv   -> CSV: detail tiap anime (tanpa daftar episode).
  </pre>
  `);
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
