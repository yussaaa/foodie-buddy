# 🍜 Foodie Buddy

A bilingual (中文 / English) food exploration app that helps you discover, save, and learn about restaurants and cuisines around the world.

Available as a **Next.js web app** and a **React Native iOS app**.

---

## 💡 Inspiration

This project was born from a personal frustration: walking into a restaurant, staring at the menu, and having no idea what to order — not because the food wasn't appealing, but because the cuisine itself was unfamiliar.

Whether it's a Sichuan hotpot spot, a Peruvian ceviche bar, or a traditional Moroccan riad, every cuisine carries a rich cultural story that most diners never get to hear. Foodie Buddy was built to change that — to give curious eaters a way to explore the *why* behind what's on the plate before (and after) they sit down to eat.

---

## ✨ Features

- 🗺️ **Map View** — visualize all your saved restaurants on an interactive Google Map
- 🔍 **Explore** — search any restaurant and get AI-powered insights:
  - Cuisine history & cultural background
  - Signature dishes likely on the menu
  - Cuisine classics (iconic dishes of the cuisine type)
  - Ingredient breakdowns & flavor pairings
  - Quick links: Directions, Google Maps, Website, Yelp
- 💾 **Save Restaurants** — bookmark places to your personal map with visited / wishlist status
- 🌐 **Bilingual UI** — full Chinese (简体中文) and English support, switch at any time
- 🔐 **Auth** — email/password sign-up, login, and forgot-password flow via Supabase

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Framework | Next.js 16 (App Router) |
| Mobile | React Native + Expo SDK 55 + Expo Router v4 |
| Styling | Tailwind CSS / NativeWind v4 |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| AI | OpenAI API (GPT-4o) |
| Maps | Google Maps Platform (Maps JS API, Places API New, Geocoding API) |
| Image Search | Serper API / Pexels API |
| Deployment | Vercel (Web) · Expo EAS (iOS) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key
- A [Google Maps Platform](https://console.cloud.google.com) API key with Maps JS API, Places API (New), and Geocoding API enabled

### 1. Clone & install

```bash
git clone https://github.com/yussaaa/foodie-buddy.git
cd foodie-buddy
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
SERPER_API_KEY=...          # optional – dish photos
PEXELS_API_KEY=...          # optional – dish photos fallback
```

### 3. Set up the database

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor to create all tables and RLS policies.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📱 Mobile App

```bash
cd mobile
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL
npm install
npm start
```

---

## 📁 Project Structure

```
foodie-buddy/
├── src/
│   ├── app/               # Next.js App Router pages & API routes
│   │   ├── api/           # Server-side API endpoints
│   │   ├── explore/       # Restaurant exploration page
│   │   ├── map/           # Interactive map page
│   │   ├── login/         # Auth page (login / sign-up / forgot password)
│   │   └── auth/          # Supabase auth callbacks
│   ├── components/        # Shared React components
│   ├── lib/               # API clients (Supabase, OpenAI, Google Places)
│   └── types/             # TypeScript type definitions
├── mobile/                # React Native / Expo app
├── supabase/              # Database schema & migrations
├── scripts/               # Utility scripts (e.g. prompt sync)
└── .env.example           # Environment variable template
```

---

## 🔧 Useful Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `cd mobile && npm start` | Start Expo dev server |
| `python3 scripts/update_prompts.py` | Sync AI prompts to Dev DB |
| `python3 scripts/update_prompts.py --prod` | Sync AI prompts to Prod DB |

---

## 🗺️ Roadmap

- [ ] **User-configurable AI settings** — let users bring their own API key, choose a preferred model, and customize the AI prompt to tailor the experience to their tastes and dietary preferences
- [ ] **Smarter menu intelligence** — improve the AI agent's ability to identify a restaurant's true signature dishes by pulling from richer, multi-source data (menus, reviews, photos, and more) rather than inference alone
- [ ] **Social food maps** — share your restaurant map with friends, see where the people you follow have eaten, and discover new spots through your social circle *(coming later)*
- [ ] **Custom map markers** — personalize how restaurants appear on your map with cuisine-specific icons, color-coded categories, or your own photo pins to make the map truly yours

---

## 📄 License

MIT
