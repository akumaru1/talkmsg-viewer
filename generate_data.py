import os
import json
import pathlib
import subprocess

# --- CONFIGURATION ---
root_dir = "/home/akumaru/Downloads/colmsg"
output_dir = pathlib.Path("./data")
output_dir.mkdir(exist_ok=True)

def has_video_track(file_path):
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'json', str(file_path)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5
        )
        data = json.loads(result.stdout)
        return any(s.get('codec_type') == 'video' for s in data.get('streams', []))
    except:
        return file_path.stat().st_size >= 2000000

def generate_data():
    all_members = []

    for root, dirs, files in os.walk(root_dir):
        if not files: continue
            
        current_path = pathlib.Path(root)
        path_parts = current_path.relative_to(root_dir).parts
        if len(path_parts) != 2: continue  # only process the member level, not sub-folders

        group_name = path_parts[0]
        member_name = path_parts[1]
        
        member_messages = []
        MEDIA_EXTS = {'.txt', '.jpg', '.jpeg', '.png', '.mp4', '.mov', '.aac', '.m4a'}
        base_names = set(f.rsplit('.', 1)[0] for f in files if pathlib.Path(f).suffix.lower() in MEDIA_EXTS)

        for base_name in sorted(base_names):
            if base_name == 'avatar': continue  # handled separately as avatar image
            txt_p = current_path / f"{base_name}.txt"
            # Accept .jpg or .png for images
            img_p = next((current_path / f"{base_name}{e}" for e in ('.jpg', '.jpeg', '.png') if (current_path / f"{base_name}{e}").exists()), None)
            # Accept .mp4 or .mov for video/voice
            vid_p = next((current_path / f"{base_name}{e}" for e in ('.mp4', '.mov', '.aac', '.m4a') if (current_path / f"{base_name}{e}").exists()), None)

            content = ""
            if txt_p.exists():
                with open(txt_p, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read().strip()

            # Store RELATIVE paths so the web server can find them
            rel_img = str(img_p.relative_to(root_dir)) if img_p else None
            rel_vid = str(vid_p.relative_to(root_dir)) if vid_p else None

            m_type = "text"
            if vid_p:
                # Audio-only extensions are always voice
                if vid_p.suffix.lower() in ('.aac', '.m4a'):
                    m_type = "voice"
                else:
                    m_type = "video" if has_video_track(vid_p) else "voice"
            elif img_p:
                m_type = "image"

            # Extract and validate the timestamp segment
            raw_ts = base_name.split('_')[-1]
            if len(raw_ts) == 13 and raw_ts.isdigit():
                raw_ts = raw_ts[:8] + '0' + raw_ts[8:]  # zero-pad single-digit hour
            timestamp = raw_ts if (len(raw_ts) == 14 and raw_ts.isdigit()) else "00000000000000"
            if timestamp == "00000000000000":
                print(f"  WARNING: unexpected filename (no timestamp): {base_name}")

            member_messages.append({
                "id": base_name,
                "timestamp": timestamp,
                "text": content,
                "image": rel_img,
                "media": rel_vid,
                "type": m_type
            })

        # Sort member messages newest first
        member_messages.sort(key=lambda x: x['timestamp'], reverse=True)

        # Save individual member file
        member_filename = f"{group_name}_{member_name}".replace(" ", "_") + ".json"
        with open(output_dir / member_filename, 'w', encoding='utf-8') as f:
            json.dump(member_messages, f, indent=4, ensure_ascii=False)

        # Check for optional avatar image
        avatar_p = pathlib.Path(root_dir) / group_name / member_name / "avatar.png"
        rel_avatar = str(avatar_p.relative_to(root_dir)) if avatar_p.exists() else None
        avatar_mtime = int(avatar_p.stat().st_mtime) if avatar_p.exists() else None

        # Build Hub preview: prefer text, fall back to a type label for media-only messages
        if member_messages:
            last = member_messages[0]
            last_preview = last['text'][:30] if last['text'] else f"[{last['type']}]"
            last_ts = last['timestamp']
        else:
            last_preview = ""
            last_ts = "00000000000000"

        # Add to the "Hub" index
        all_members.append({
            "group": group_name,
            "name": member_name,
            "data_file": member_filename,
            "last_message": last_preview,
            "last_timestamp": last_ts,
            "avatar": rel_avatar,
            "avatar_mtime": avatar_mtime
        })

    # Sort members by most recent message first
    all_members.sort(key=lambda m: m['last_timestamp'], reverse=True)

    # Save the index file for the Hub view
    with open(output_dir / "members.json", "w", encoding='utf-8') as f:
        json.dump(all_members, f, indent=4, ensure_ascii=False)
    
    print(f"Done! Created index and {len(all_members)} member files.")

if __name__ == "__main__":
    generate_data()