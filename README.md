# Mobame Viewer

A local web viewer for Nogizaka46 Mobame (mobile mail) messages.  
Browse chat messages, photos, and videos from your downloaded Mobame data through a clean React interface.

> **⚠️ AI Disclaimer**  
> This project was generated with the assistance of an AI coding assistant (GitHub Copilot). Use it at your own discretion.

---

## Prerequisites

| Tool | Minimum Version | Download |
|------|----------------|----------|
| **Node.js** | v18 or later | https://nodejs.org |
| **npm** | v9 or later (bundled with Node.js) | — |
| **Git** | any recent version | https://git-scm.com |

You also need your **downloaded Mobame media folder** (`colmsg` directory from your Mobame backup tool).

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/akumaru1/mobame.git
cd mobame
```

### 2. Install all dependencies

```bash
npm run setup
```

This installs root, server, and client dependencies in one command and auto-creates a `.env` file from the template.

### 3. Set your media directory

Open the `.env` file that was just created and point `MEDIA_DIR` at your Mobame media folder:

```env
MEDIA_DIR=/absolute/path/to/your/colmsg
PORT=3001
```

**Example paths:**

- Linux/macOS: `MEDIA_DIR=/home/yourname/Downloads/colmsg`
- Windows: `MEDIA_DIR=C:/Users/yourname/Downloads/colmsg`

> The folder structure should look like `colmsg/乃木坂46/田村真佑/xxxxxx.jpg`

### 4. Start the app

```bash
npm run dev
```

This starts both the Express backend and the Vite frontend simultaneously.  
Open your browser at **http://localhost:5173**

> Data generation can be triggered from within the app once it's running.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Install all dependencies and create `.env` |
| `npm run dev` | Start server + client in development mode |
| `npm run server` | Start only the Express server |
| `npm run client` | Start only the Vite frontend |
| `npm run generate` | Manually scan `MEDIA_DIR` and rebuild the `data/` JSON files |

---

## Project Structure

```
mobame/
├── client/          # React + Vite frontend
├── server/          # Express backend
├── data/            # Generated JSON data (created on first generate)
├── generate_data.js # Script that builds data/ from your MEDIA_DIR
├── .env.example     # Environment variable template
└── package.json     # Root monorepo scripts
```

---

## Troubleshooting

**`Error: MEDIA_DIR is not set`**  
→ Open `.env` and make sure `MEDIA_DIR` is set to the correct path, then restart with `npm run dev`.

**Port conflict on 3001**  
→ Change `PORT=3001` to another port in `.env`, then restart with `npm run dev`.

**Media images/videos not loading**  
→ Verify `MEDIA_DIR` in `.env` points to the `colmsg` root folder (the one containing group subfolders like `乃木坂46/`).
