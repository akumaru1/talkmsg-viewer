'use strict';

const fs   = require('fs');
const path = require('path');


// --- Load .env from project root (no extra packages required) ----------------
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIdx = trimmed.indexOf('=');
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

// --- Configuration -----------------------------------------------------------
const MEDIA_DIR = process.env.MEDIA_DIR || '';
if (!MEDIA_DIR) {
  console.error(
    'ERROR: MEDIA_DIR is not set.\n' +
    'Copy .env.example to .env and set MEDIA_DIR to the path of your colmsg folder.'
  );
  process.exit(1);
}

const rootDir   = MEDIA_DIR;
const outputDir = path.join(__dirname, 'data');
fs.mkdirSync(outputDir, { recursive: true });

const MEDIA_EXTS = new Set(['.txt', '.jpg', '.jpeg', '.png', '.mp4', '.mov', '.aac', '.m4a']);

// -----------------------------------------------------------------------------

// Detects a video track by scanning for the MP4 'vide' handler atom in the file header/footer.
// Checks both the start (faststart / moov-at-front) and end (moov-at-back) of the file.
function hasVideoTrack(filePath) {
  const VIDEO_MARKER = Buffer.from('vide');
  try {
    const stat  = fs.statSync(filePath);
    const chunk = Math.min(stat.size, 65536);
    const fd    = fs.openSync(filePath, 'r');
    try {
      const startBuf = Buffer.alloc(chunk);
      fs.readSync(fd, startBuf, 0, chunk, 0);
      if (startBuf.includes(VIDEO_MARKER)) return true;

      if (stat.size > chunk) {
        const endBuf = Buffer.alloc(chunk);
        fs.readSync(fd, endBuf, 0, chunk, stat.size - chunk);
        if (endBuf.includes(VIDEO_MARKER)) return true;
      }
    } finally {
      fs.closeSync(fd);
    }
    return false;
  } catch {
    // Fall back to size heuristic (≥2 MB → treat as video)
    try { return fs.statSync(filePath).size >= 2_000_000; } catch { return false; }
  }
}

function processMemberDir(rootPath, memberPath) {
  const rel   = path.relative(rootPath, memberPath);
  const parts = rel.split(path.sep);
  const groupName  = parts[0];
  const memberName = parts[1];

  const files = fs.readdirSync(memberPath).filter(f =>
    fs.statSync(path.join(memberPath, f)).isFile()
  );

  // Collect unique base names that have at least one recognised media extension
  const baseNames = new Set();
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (MEDIA_EXTS.has(ext)) baseNames.add(path.basename(f, path.extname(f)));
  }

  const memberMessages = [];

  for (const baseName of [...baseNames].sort()) {
    if (baseName === 'avatar') continue;

    const txtP = path.join(memberPath, `${baseName}.txt`);

    // Find image file (.jpg / .jpeg / .png)
    let imgP = null;
    for (const ext of ['.jpg', '.jpeg', '.png']) {
      const p = path.join(memberPath, `${baseName}${ext}`);
      if (fs.existsSync(p)) { imgP = p; break; }
    }

    // Find video/audio file (.mp4 / .mov / .aac / .m4a)
    let vidP = null;
    for (const ext of ['.mp4', '.mov', '.aac', '.m4a']) {
      const p = path.join(memberPath, `${baseName}${ext}`);
      if (fs.existsSync(p)) { vidP = p; break; }
    }

    let content = '';
    if (fs.existsSync(txtP)) content = fs.readFileSync(txtP, 'utf8').trim();

    // Store RELATIVE paths so the web server can find them
    const relImg = imgP ? path.relative(rootPath, imgP).split(path.sep).join('/') : null;
    const relVid = vidP ? path.relative(rootPath, vidP).split(path.sep).join('/') : null;

    let mType = 'text';
    if (vidP) {
      const ext = path.extname(vidP).toLowerCase();
      mType = (ext === '.aac' || ext === '.m4a') ? 'voice'
            : hasVideoTrack(vidP) ? 'video' : 'voice';
    } else if (imgP) {
      mType = 'image';
    }

    // Extract and validate the timestamp segment (last underscore-delimited part)
    let rawTs = baseName.split('_').pop();
    if (rawTs.length === 13 && /^\d+$/.test(rawTs)) {
      rawTs = rawTs.slice(0, 8) + '0' + rawTs.slice(8); // zero-pad single-digit hour
    }
    let timestamp = rawTs;
    if (!/^\d{14}$/.test(timestamp)) {
      console.warn(`  WARNING: unexpected filename (no timestamp): ${baseName}`);
      timestamp = '00000000000000';
    }

    memberMessages.push({ id: baseName, timestamp, text: content, image: relImg, media: relVid, type: mType });
  }

  // Sort newest first
  memberMessages.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Write individual member JSON
  const memberFilename = `${groupName}_${memberName}`.replace(/ /g, '_') + '.json';
  fs.writeFileSync(
    path.join(outputDir, memberFilename),
    JSON.stringify(memberMessages, null, 4),
    'utf8'
  );

  // Avatar
  let avatarP = null;
  for (const ext of ['.png', '.jpg', '.jpeg']) {
    const p = path.join(rootPath, groupName, memberName, `avatar${ext}`);
    if (fs.existsSync(p)) { avatarP = p; break; }
  }

  const relAvatar = avatarP ? path.relative(rootPath, avatarP).split(path.sep).join('/') : null;
  const avatarMtime = avatarP ? Math.floor(fs.statSync(avatarP).mtimeMs / 1000) : null;

  // Hub preview
  let lastPreview = '';
  let lastTs      = '00000000000000';
  if (memberMessages.length > 0) {
    const last  = memberMessages[0];
    lastPreview = last.text ? last.text.slice(0, 30) : `[${last.type}]`;
    lastTs      = last.timestamp;
  }

  return {
    group:          groupName,
    name:           memberName,
    data_file:      memberFilename,
    last_message:   lastPreview,
    last_timestamp: lastTs,
    avatar:         relAvatar,
    avatar_mtime:   avatarMtime,
  };
}

function generateData() {
  const allMembers = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(dir, entry.name);
      const parts    = path.relative(rootDir, fullPath).split(path.sep);

      if (parts.length === 2) {
        // Member-level directory — only process if it contains files
        const hasFiles = fs.readdirSync(fullPath).some(f =>
          fs.statSync(path.join(fullPath, f)).isFile()
        );
        if (!hasFiles) continue;
        console.log(`  Scanning: ${parts[0]} / ${parts[1]} …`);
        allMembers.push(processMemberDir(rootDir, fullPath));
      } else if (parts.length < 2) {
        walk(fullPath);
      }
      // Ignore deeper nesting
    }
  }

  walk(rootDir);

  // Sort members by most recent message first
  allMembers.sort((a, b) => b.last_timestamp.localeCompare(a.last_timestamp));

  fs.writeFileSync(
    path.join(outputDir, 'members.json'),
    JSON.stringify(allMembers, null, 4),
    'utf8'
  );

  console.log(`Done! Created index and ${allMembers.length} member files.`);
}

module.exports = { hasVideoTrack, processMemberDir, rootDir, outputDir };

if (require.main === module) {
  generateData();
}
