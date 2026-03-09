# Mobame Viewer

A local web viewer for downloaded [colmsg](https://github.com/proshunsuke/colmsg) Mobame (mobile mail) messages.

---

## Features

- **Calendar Jump**: Quickly jump to any date to view messages sent on that day, just like the official Mobame app.
- **Media Gallery**: Browse all images and videos sent by members in a dedicated gallery view.
- **Favorites**: Mark and view your favorite messages for easy access later.

> **⚠️ This project was generated with the assistance of an AI coding assistant (GitHub Copilot).**

---

## Prerequisites

| Tool | Minimum Version | 
|------|----------------|
| **Node.js** | v18 or later | 
| **npm** | v9 or later (bundled with Node.js) | 


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


### 3. Set your media directory

Open the `.env` file that was just created and point `MEDIA_DIR` at your `colmsg` folder:

```env
MEDIA_DIR=/path/to/colmsg
PORT=3001
ONLINE_MEMBERS=一ノ瀬美空,井上和,奥田いろは,田村真佑
```

**Example paths:**

- Linux/macOS: `MEDIA_DIR=/home/yourname/Downloads/colmsg`
- Windows: `MEDIA_DIR=C:\Users\yourname\Downloads\colmsg`


### 3a. (Optional) Add member icons

You can add profile icons for members by placing an image file in their folder:

```
colmsg/
├── 乃木坂46
│   └── 一ノ瀬美空
│       ├── avatar.png
│       └── xxxxxx.jpg
```

Supported formats: `avatar.jpeg`, `avatar.jpg`, `avatar.png`

### 4. Start the app

```bash
npm run dev
```

Open your browser at **http://localhost:5173**

> Press the sync button from the app once it's running.

---

