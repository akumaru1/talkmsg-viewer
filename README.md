# Talkmsg Viewer

A local web viewer for downloaded [colmsg](https://github.com/proshunsuke/colmsg) Talk Messages.

---
## App Preview

| Home Screen | Chat View | Media Gallery |
| :--- | :--- | :--- |
| <img src="https://github.com/user-attachments/assets/6a92de4d-2c88-4911-8b4d-3166d3f02443" width="100%"> | <img src="https://github.com/user-attachments/assets/54702dae-5c44-4d65-acbc-75578709a830" width="100%"> | <img src="https://github.com/user-attachments/assets/82e1c026-3cfd-469f-a209-190073eb146c" width="100%"> |

---

## Features

- **Calendar Jump**: Quickly jump to any date to view messages sent on that day, just like the official talk app.
- **Media Gallery**: Browse all images and videos sent by members in a dedicated gallery view.
- **Favorites**: Mark and view your favorite messages for easy access later.


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
git clone https://github.com/akumaru1/talkmsg-viewer.git
cd talkmsg-viewer
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
> **⚠️ This project was generated with the assistance of an AI coding assistant (GitHub Copilot).**
---
