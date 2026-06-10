# Panteon Leaderboard System

Panteon Games Full Stack Developer Case — Haftalık liderlik tablosu sistemi.

2 milyon günlük aktif oyuncuya ölçeklenebilir şekilde tasarlandı.

---

## 🚀 Live Demo

> **Frontend:** https://fsd-leaderboard-9haotmwn6-merts-projects-21f3aa72.vercel.app/
> **Backend API:** https://fsd-leaderboard.onrender.com/api/admin/metrics

---

## 🧪 Demo Kullanımı

Uygulamayı test etmek için:

1. `demo@panteon.games` / `demo123` ile giriş yap
2. Sol paneldeki **"Simülasyon Başlat"** butonuna bas — 90 saniyede 1 haftalık skor değişimi simüle edilir
3. Simülasyon bitince **"Haftayı Bitir ve Dağıt"** ile ödülleri dağıtır
4. Previous week ile dağıtılan ödüller görüntülenir ve yeni hafta için TOP 100 PLAYERS sıfırlanır

---

## 📋 Proje Özeti

Panteon'un idle/clicker mobil oyunu için haftalık leaderboard sistemi. Eski sistemdeki üç temel şikayeti çözmek üzere sıfırdan tasarlandı:

| Şikayet | Çözüm |
|---------|-------|
| "Leaderboard çok yavaş yükleniyor" | Redis Sorted Set — O(log N) okuma |
| "Kendi sıramı bulamıyorum" | Her kullanıcı için anlık rank + komşu listesi |
| "Scroll yaparken donuyor" | react-virtuoso ile sanal liste |

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────┐
│                   React Client                   │
│         (Vite + TypeScript + react-virtuoso)     │
└──────────────────────┬──────────────────────────┘
                       │ JWT Bearer Token
┌──────────────────────▼──────────────────────────┐
│              Node.js + Express API               │
│                  (Stateless)                     │
└──────┬──────────────┬──────────────┬────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼────────────┐
│  PostgreSQL  │ │   Redis    │ │    MongoDB      │
│  (Supabase) │ │ (Upstash)  │ │    (Atlas)      │
│             │ │            │ │                 │
│ • Kullanıcı │ │ • Sorted   │ │ • Haftalık ödül │
│   profilleri│ │   Set rank │ │   geçmişi       │
│ • Auth      │ │ • Prize    │ │ • Loglar        │
│             │ │   pool     │ │                 │
└─────────────┘ └────────────┘ └─────────────────┘
```

### Performans Kararları

**Score Buffer:** Her skor güncellemesi direkt Redis'e yazılmaz. Node.js'de in-memory `Map<userId, delta>` buffer'ı tutulur, her 5 saniyede bir `pipeline + ZINCRBY` ile toplu yazılır. 2 milyon günlük aktif kullanıcının doğrudan Redis'e yazması sistemi çökertirdi.

**Response Cache:** `GET /api/leaderboard` sonucu 5 saniyelik TTL ile Redis'te cache'lenir. 100k eş zamanlı istek tek bir PostgreSQL sorgusu ile karşılanır.

**Ödül Dağıtımı:** Hafta sonu cron job (Her Pazartesi 00:00 UTC):
- Rank 1 → %20, Rank 2 → %15, Rank 3 → %10
- Rank 4-100 → Ters ağırlıklı dağıtım: `(101 - rank) / 4753 × %55 × pool`

---

## 🛠️ Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 18, TypeScript, Vite, react-virtuoso |
| Backend | Node.js, Express, TypeScript |
| Realtime DB | Redis (Upstash) — Sorted Set |
| Persistent DB | PostgreSQL (Supabase) |
| History DB | MongoDB (Atlas) |
| Auth | JWT (24 saat TTL, stateless) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render / Railway |

---

## 📁 Proje Yapısı

```
FSD_leaderboard/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── services/          # API client (api.ts)
│   │   └── utils/             # Yardımcı fonksiyonlar
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── config/            # DB bağlantıları (postgres, redis, mongo)
│   │   ├── middleware/        # JWT authenticate
│   │   ├── models/            # MongoDB şemaları
│   │   ├── routes/            # API route'ları
│   │   ├── services/          # Business logic
│   │   │   ├── score.service.ts      # Buffer + flush
│   │   │   ├── leaderboard.service.ts # Redis sorguları
│   │   │   ├── cron.service.ts       # Haftalık reset
│   │   │   └── auth.service.ts       # Login + JWT
│   │   ├── types/             # TypeScript tip tanımları
│   │   ├── index.ts           # Express app bootstrap
│   │   └── seed.ts            # 100k kullanıcı seed script
│   └── package.json
│
├── AI_WORKFLOW.md             # AI geliştirme süreci belgesi
└── README.md
```

---

## ⚙️ Lokal Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL, MongoDB, Redis hesapları (veya cloud servisleri)

### 1. Repoyu klonla

```bash
git clone https://github.com/[USERNAME]/FSD_leaderboard.git
cd FSD_leaderboard
```

### 2. Environment variables

```bash
cd server
cp .env.example .env
```

`.env` dosyasını kendi bilgilerinle doldur:

```env
PORT=3000
NODE_ENV=development

JWT_SECRET=cok_uzun_rastgele_bir_string
JWT_EXPIRES_IN=24h

# Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:[SIFRE]@db.[REF].supabase.co:5432/postgres

# MongoDB Atlas
MONGODB_URI=mongodb+srv://[KULLANICI]:[SIFRE]@[CLUSTER].mongodb.net/panteon

# Upstash Redis
REDIS_URL=redis://default:[TOKEN]@[ENDPOINT].upstash.io:6379

CURRENT_WEEK=1
```

### 3. Backend'i başlat

```bash
cd server
npm install
npm run seed      # 100k kullanıcı oluşturur (~30 saniye)
npm run dev       # localhost:3000
```

### 4. Frontend'i başlat

```bash
cd client
cp .env.example .env
# VITE_API_URL=http://localhost:3000 ayarla
npm install
npm run dev       # localhost:5173
```

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `POST` | `/api/auth/login` | ❌ | JWT döndürür |
| `GET` | `/api/leaderboard` | ✅ | Top 100 + kullanıcı konumu |
| `POST` | `/api/score` | ✅ | Skor ekle (buffer'a) |
| `POST` | `/api/admin/trigger-cron` | ❌ dev | Manuel hafta sıfırlama |
| `POST` | `/api/admin/simulate` | ❌ dev | 999 random kullanıcıya skor ekle |
| `POST` | `/api/admin/hard-reset` | ❌ dev | Sistemi sıfırla |

### GET /api/leaderboard Response

```json
{
  "week": 3,
  "prizePool": 500000,
  "topHundred": [
    { "rank": 1, "userId": "...", "username": "player_2678", "score": 999965 }
  ],
  "currentUser": {
    "rank": 592,
    "score": 40000,
    "neighbors": [
      { "rank": 589, "username": "player_xxx", "score": 40066 },
      { "rank": 590, "username": "player_xxx", "score": 40013 },
      { "rank": 591, "username": "player_xxx", "score": 40005 },
      { "rank": 592, "username": "DemoPlayer",  "score": 40000 },
      { "rank": 593, "username": "player_xxx", "score": 39976 },
      { "rank": 594, "username": "player_xxx", "score": 39974 }
    ]
  }
}
```

---


## 📊 Ölçeklenebilirlik Notları

- **Stateless mimari:** JWT tabanlı, session yok → horizontal scaling için hazır
- **Redis O(log N):** 10 milyon kullanıcıda bile rank sorgusu milisaniyede döner
- **Score buffer:** 2M günlük aktif kullanıcı yükünü absorbe eder
- **Batch operations:** Seed ve reset işlemleri 5000'lik chunk'larla yapılır