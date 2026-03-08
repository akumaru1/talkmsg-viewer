# Mobame Viewer

A local web app for browsing downloaded Nogizaka46 Mobame (mobile mail) messages, including text, images, videos, and voice clips.

> **Disclaimer:** This project was generated with the assistance of AI (GitHub Copilot). Use at your own discretion.

---

## Prerequisites

Make sure the following are installed on your machine before getting started:

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18 or newer | [nodejs.org](https://nodejs.org) |
| **npm** | comes with Node.js | |
| **Python** | 3.9 or newer | [python.org](https://python.org) |
| **ffprobe** | any recent | Part of [FFmpeg](https://ffmpeg.org/download.html) — used to detect video files |

To verify your installs:

```bash
node -v
npm -v
python --version   # or python3 --version on Linux/macOS
ffprobe -version
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/akumaru1/mobame.git
cd mobame
```

### 2. Install server dependencies

```bash
cd server
npm install
cd ..
```

### 3. Install client dependencies

```bash
cd client
npm install
cd ..
```

---

## Configuration

### 1. Copy the example environment file

```bash
cp .env.example .env
```

### 2. Edit `.env`

Open `.env` in any text editor and set `MEDIA_DIR` to the path of your downloaded messages folder (`colmsg`):

```env
# Path to the folder that contains your downloaded messages (the colmsg root).
# Each sub-folder is a group, each sub-sub-folder is a member.
MEDIA_DIR=/path/to/your/colmsg

# Port the Express server listens on (default: 3001)
PORT=3001
```

The `colmsg` folder is expected to have this structure:

```
colmsg/
└── 乃木坂46/
    ├── 田村真佑/
    │   ├── 20240101120000.txt
    │   ├── 20240101120000.jpg
    │   └── avatar.jpg
    ├── 久保史緒里/
    │   └── ...
    └── ...
```

---

## Generating the data index

Before running the app for the first time, you need to build the data index. You have two options:

**Option A — via the app (easiest):**
Once the app is running, click the **⚙️** icon in the top-right corner and choose **Sync All**. The app will scan your `colmsg` folder in the background and notify you when it's done. Refresh the page afterward.

**Option B — via the command line:**

```bash
python generate_data.py
```

This scans your `colmsg` folder and writes JSON index files into the `data/` directory. You should see output like:

```
Scanning: 乃木坂46 / 田村真佑 …
Scanning: 乃木坂46 / 久保史緒里 …
...
Done! Created index and 13 member files.
```

> **Note:** On some systems you may need to use `python3` instead of `python`.

Run either option again any time you add new downloaded messages.

---

## Running the app

### Development mode (recommended)

Starts both the backend server and the frontend dev server together:

```bash
npm run dev
```

Then open your browser at **http://localhost:5173**

To run them separately in two terminals:

```bash
# Terminal 1 – backend
npm run server

# Terminal 2 – frontend
npm run client
```

### Production mode (optional)

Build the frontend into a static bundle served directly by Express:

```bash
cd client
npm run build
cd ..
npm run server
```

Then open **http://localhost:3001**

