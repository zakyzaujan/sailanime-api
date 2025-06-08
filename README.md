
---

## Cara Menjalankan

1. **Clone repository**

   ```bash
   git clone https://github.com/zakyzaujan/sailanime-api.git
   cd sailanime-api
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```
3. **Jalankan server**

   ```bash
   node server.js
   ```

   Server akan berjalan di:

   ```
   http://localhost:5000
   ```

---

## Base URL

```
http://localhost:5000
```

---

### 1. Daftar Anime

```
GET /api/anime
```

#### Contoh Request

```
GET http://localhost:5000/api/anime
```

#### Contoh Response

```json
{
  "success": true,
  "count": 123,
  "data": [
    {
      "id": 1,
      "group": "A",
      "nama": "Attack on Titan",
      "url": "https://154.26.137.28/anime/attack-on-titan/"
    },
    …
  ]
}
```

---

### 2. Detail Anime

```
GET /api/anime/:id
```

* `:id`
  ID anime yang diinginkan (angka).

#### Contoh Request

```
GET http://localhost:5000/api/anime/1
```

#### Contoh Response

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
        "title": "Attack on Titan Episode 1 Subtitle Indonesia",
        "href": "https://154.26.137.28/attack-on-titan-episode-1/"
      },
      …
    ]
  }
}
```

---

### 3. Detail Episode

```
GET /api/anime/:id/:episodeNumber
```

* `:id`
  ID anime (angka).
* `:episodeNumber`
  Nomor episode yang ingin diambil detailnya.

#### Contoh Request

```
GET http://localhost:5000/api/anime/1/1
```

#### Contoh Response

```json
{
  "success": true,
  "data": {
    "slug": "attack-on-titan-episode-1",
    "title": "Attack on Titan Episode 1 Subtitle Indonesia",
    "episode_number": "1",
    "mirrors": [
      {
        "label": "acefile 720p",
        "embedHtml": "<iframe src=\"...\"…></iframe>"
      },
      …
    ],
    "source_url": "https://154.26.137.28/attack-on-titan-episode-1/"
  }
}
```

---

## Deskripsi Field

| Field            | Tipe          | Keterangan                                 |
| ---------------- | ------------- | ------------------------------------------ |
| `id`             | number/string | Identitas unik anime atau episode          |
| `group`          | string        | Kategori grup scraping (internal)          |
| `nama`           | string        | Judul anime                                |
| `url`            | string        | Link halaman anime di AnimeSail            |
| `thumbnail`      | string        | URL gambar cover                           |
| `alternatif`     | string        | Judul alternatif                           |
| `tipe`           | string        | Jenis (TV/Movie/OVA)                       |
| `jumlah_episode` | string        | Total episode                              |
| `skor`           | string        | Rating skor                                |
| `genre`          | string\[]     | Daftar genre                               |
| `status`         | string        | Status anime (Ongoing/Completed)           |
| `studio`         | string        | Rumah produksi                             |
| `dirilis`        | string        | Tahun rilis                                |
| `musim`          | string        | Musim rilis (misal “Spring 2013”)          |
| `sinopsis`       | string        | Ringkasan cerita                           |
| `episodes`       | object\[]     | Array objek episode (title & href)         |
| `slug`           | string        | Identifier episode                         |
| `title`          | string        | Judul episode dengan subtitle Indonesia    |
| `episode_number` | string        | Nomor episode                              |
| `mirrors`        | object\[]     | Array sumber streaming (label & embedHtml) |
| `source_url`     | string        | URL halaman sumber episode                 |

---
