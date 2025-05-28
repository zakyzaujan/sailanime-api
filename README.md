# SailAnime API

API Node.js + Express untuk scraping data anime dari AnimeSail menggunakan Puppeteer & Cheerio.

---

## Fitur

1. **GET /api/anime**  
   Daftar semua anime.

2. **GET /api/anime/:id**  
   Detail anime.

3. **GET /api/anime/:id/:episodeNumber**  
   Detail satu episode.

---

## Instalasi

```bash
git clone https://github.com/zakyzaujan/sailanime-api.git
cd sailanime-api
npm install
node server.js
```

Server berjalan di `http://localhost:5000`.

---

## Contoh Request & Response

### GET /api/anime

```json
{
  "success": true,
  "count": 123,
  "data": [
    {
      "id":1,
      "group":"A",
      "nama":"Attack on Titan",
      "url":"https://154.26.137.28/anime/attack-on-titan/"
    },
    …
  ]
}
```

### GET /api/anime/1

```json
{
  "success": true,
  "data": {
    "id": 1,
    "nama": "Attack on Titan",
    "url": "https://154.26.137.28/anime/attack-on-titan/",
    "thumbnail": "https://…/cover.jpg",
    "alternatif": "...",
    "tipe": "TV",
    "jumlah_episode": "25",
    "skor": "8.9",
    "genre": ["Action","Drama","Fantasy"],
    "status": "Completed",
    "studio": "Wit Studio",
    "dirilis": "2013",
    "musim": "Spring 2013",
    "sinopsis": "Eren Yeager bertekad …",
    "episodes": [
      {
        "title":"Attack on Titan Episode 1 Subtitle Indonesia",
        "href":"https://154.26.137.28/attack-on-titan-episode-1/"
      },
      …
    ]
  }
}
```

### GET /api/anime/1/1

```json
{
  "success": true,
  "data": {
    "slug": "attack-on-titan-episode-1",
    "title": "Attack on Titan Episode 1 Subtitle Indonesia",
    "episode_number": "1",
    "mirrors": [
      {
        "label":"acefile 720p",
        "embedHtml":"<iframe src=\"...\"…></iframe>"
      },
      …
    ],
    "source_url": "https://154.26.137.28/attack-on-titan-episode-1/"
  }
}
```

---
