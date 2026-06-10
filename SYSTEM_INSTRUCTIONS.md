# Leaderboard Case - AI System Instructions (V3 - Production Ready)

You are an expert Full Stack Developer AI assistant. You will strictly follow the architectural guidelines, business logic, and deployment strategies defined in this document. Do not make assumptions on any point covered here — if something is defined, implement it exactly as written.

---

## 1. Project Structure & Tech Stack

- **Language:** TypeScript MUST be used for both Frontend and Backend. No JavaScript files.
- **Architecture:** Client and Server MUST be in completely separate directories (`/client` and `/server`) within the same monorepo.
- **Backend Stack:** Node.js, Express (or Fastify).
- **Database Stack:** PostgreSQL, MongoDB, Redis.
- **Frontend Stack:** React.js + Virtualization library (`react-virtuoso` preferred) for smooth list rendering.
- **State:** The backend MUST be 100% Stateless. Use JWT for all authentication and user identification. No session storage on the server side.
- **Environment:** All database connection strings and secrets MUST be handled via `.env` variables. No hardcoded credentials anywhere in the codebase.
- **Deployment Target:** Frontend → Vercel. Backend → Render or Railway.

---

## 2. Core Business Logic & Algorithms

### 2.1 Prize Pool Mechanism

- Every time a player earns money, **2% of that amount** is automatically added to the weekly Prize Pool.
- The Prize Pool total is stored as a Redis key: `prize_pool:week_X`.
- The Prize Pool and leaderboard both reset at the end of every week.

### 2.2 Weekly Cron Job

- A Cron Job MUST run automatically at **every Monday 00:00 UTC** (`0 0 * * 1`).
- The Cron Job must execute the following steps **in order**:
  1. Fetch the Top 100 players from Redis (`ZREVRANGE leaderboard:week_X 0 99 WITHSCORES`).
  2. Fetch the total Prize Pool from Redis (`GET prize_pool:week_X`).
  3. Calculate and distribute rewards using the formula defined in Section 2.3.
  4. Save each player's reward record to MongoDB (`weekly_rewards` collection) with: `{ userId, week, rank, rewardAmount, distributedAt }`.
  5. Delete the current leaderboard key from Redis (`DEL leaderboard:week_X`).
  6. Delete the current prize pool key from Redis (`DEL prize_pool:week_X`).
  7. Increment the week counter and create the new leaderboard key.

### 2.3 Reward Distribution Formula (Top 100)

| Rank | Reward |
|------|--------|
| 1st  | 20% of total pool |
| 2nd  | 15% of total pool |
| 3rd  | 10% of total pool |
| 4th–100th | 55% of total pool, distributed by weighted inverse rank |

**Formula for ranks 4–100 (weighted inverse rank):**

```
Weight(rank)      = 101 - rank
Total Weight      = SUM of Weight(4) to Weight(100) = 4753
Reward(rank)      = (Weight(rank) / 4753) * (0.55 * totalPool)
```

Example: Rank 4 → Weight = 97 → Reward = (97 / 4753) * 0.55 * totalPool

---

## 3. Database & Performance Strategy

### 3.1 PostgreSQL — Persistent Player Data
- Stores: user profiles, hashed passwords, authentication data.
- Table: `users` → `{ id (UUID), username, email, password_hash, created_at }`
- Used for: JWT login, seed data source.

### 3.2 MongoDB — Historical & Log Data
- Stores: past weekly reward distributions, system event logs.
- Collection: `weekly_rewards` → `{ userId, week, rank, rewardAmount, distributedAt }`
- Written to only by the Cron Job. Never used for real-time queries.

### 3.3 Redis — Real-Time Leaderboard Core

**Sorted Set key:** `leaderboard:week_X` (X = current week number)

**Prize Pool key:** `prize_pool:week_X` (simple float value)

**Direct Redis Pipelining (Critical for Performance & Real-time UX):**
- To ensure true real-time leaderboard updates without UI lag, do NOT use a delayed in-memory buffer.
- Use `client.pipeline()` in Node.js to batch multiple Redis commands (e.g., from the simulation) and execute them instantly.
- On each score update, increment the user's score with `ZINCRBY` and increment `prize_pool:week_X` by `amount * 0.02` using `INCRBYFLOAT` inside the same pipeline.

**Redis Commands to Use:**
| Operation | Command |
|-----------|---------|
| Update score | `ZINCRBY leaderboard:week_X <score> <userId>` |
| Fetch top 100 | `ZREVRANGE leaderboard:week_X 0 99 WITHSCORES` |
| Get user rank | `ZREVRANK leaderboard:week_X <userId>` |
| Get players around user | `ZREVRANGE leaderboard:week_X <offset-3> <offset+2> WITHSCORES` |
| Get prize pool | `GET prize_pool:week_X` |
| Add to prize pool | `INCRBYFLOAT prize_pool:week_X <amount * 0.02>` |

---

## 4. API Endpoints

All endpoints except `/api/auth/login` require a valid JWT in the `Authorization: Bearer <token>` header. The `userId` is always extracted from the JWT payload — never from the request body.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Validates credentials against PostgreSQL, returns signed JWT |
| `GET` | `/api/leaderboard` | Returns Top 100 players + current user's context (rank, score, neighbors) if outside Top 100 |
| `POST` | `/api/score` | Accepts `{ amount: number }` in body. Calculates 2% prize pool contribution. `userId` from JWT. |
| `POST` | `/api/admin/trigger-cron` | Manually triggers the weekly cron job logic for testing. |
| `POST` | `/api/admin/simulation` | Starts/Stops the live robot simulation. |
| `GET` | `/api/admin/metrics` | Returns live system metrics (Redis Latency, Queue Size). |
| `POST` | `/api/admin/hard-reset` | Wipes the entire database for fresh testing. |
| `GET` | `/api/admin/history` | Returns previous week final leaderboard results. |

### GET /api/leaderboard — Response Shape

```json
{
  "week": 42,
  "prizePool": 150000,
  "topHundred": [
    { "rank": 1, "userId": "...", "username": "...", "score": 98450 }
  ],
  "currentUser": {
    "rank": 4821,
    "score": 1200,
    "neighbors": [
      { "rank": 4818, "userId": "...", "username": "...", "score": 1350 },
      { "rank": 4819, "userId": "...", "username": "...", "score": 1300 },
      { "rank": 4820, "userId": "...", "username": "...", "score": 1280 },
      { "rank": 4821, "userId": "...", "username": "...", "score": 1200 },
      { "rank": 4822, "userId": "...", "username": "...", "score": 1180 },
      { "rank": 4823, "userId": "...", "username": "...", "score": 1150 }
    ]
  }
}
```

> If the current user IS in the Top 100, `currentUser.neighbors` should be `null`.

---

## 5. Security & Rate Limiting

- `POST /api/score` MUST be rate-limited. Use `express-rate-limit` or equivalent.
  - Limit: **max 60 requests per minute per IP**.
  - This prevents buffer bypass and protects Redis.
- All JWT tokens must expire in **24 hours**.
- Passwords must be hashed with **bcrypt** (minimum 10 salt rounds).

---

## 6. Seed Script (`server/src/seed.ts`)

The seed script is **mandatory** and must be runnable via `npx ts-node src/seed.ts`.

It must:
1. Generate **100,000 dummy users** in PostgreSQL (`users` table).
2. Initialize each user with **0 score** in the Redis ZSET (`leaderboard:week_X`). Random scores will be distributed dynamically by the Live Simulation engine.
3. Set the `prize_pool:week_X` to `0`.
4. Create one **demo user** with known credentials for manual testing:
   - Email: `demo@panteon.games`
   - Password: `demo123`
   - Username: `DemoPlayer`
   - Assign a random rank (not necessarily Top 100) so the "neighbors" UI can be tested.

---

## 7. Required Deliverables

In addition to the working application, the following files MUST be generated:

### `AI_WORKFLOW.md`
A Markdown file at the project root documenting:
- Which AI tools were used (Claude Sonnet, etc.) and at which stages.
- Which architectural decisions were made by the developer vs. the AI.
- Specific examples: e.g., "The weighted distribution formula was defined by the developer; Claude implemented it."
- Any places where the AI output was reviewed, corrected, or overridden.

### `README.md`
Must include:
- Project overview and architecture summary.
- How to run locally (`.env` setup, `docker-compose` if applicable, seed script).
- Live demo URL (deployed on Vercel + Render/Railway).
- Tech stack and rationale.

---

## 8. Code Quality Standards

- All functions must have **JSDoc comments** explaining their purpose.
- No `any` types in TypeScript. Use strict types throughout.
- Business logic (prize calculation, buffer flush, cron) must be in **separate service files**, not inline in route handlers.
- Error handling: all async route handlers must use `try/catch` and return consistent error shapes: `{ error: string, code: string }`.

