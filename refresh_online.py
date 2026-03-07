import re
import json
import pathlib

# Reuse the shared scanner and config from generate_data.py
from generate_data import has_video_track, process_member_dir, root_dir, output_dir

# Path to the React component that declares ONLINE_MEMBERS
HUB_JSX = pathlib.Path(__file__).parent / "client" / "src" / "components" / "Hub.jsx"


def parse_online_members() -> set:
    """
    Extract the ONLINE_MEMBERS Set from Hub.jsx without importing JS.
    Looks for the pattern:
        const ONLINE_MEMBERS = new Set([
          '一ノ瀬美空',
          ...
        ]);
    Returns a Python set of member name strings.
    """
    content = HUB_JSX.read_text(encoding='utf-8')
    match = re.search(
        r'const\s+ONLINE_MEMBERS\s*=\s*new\s+Set\s*\(\s*\[(.*?)\]\s*\)',
        content,
        re.DOTALL,
    )
    if not match:
        raise ValueError(f"Could not find ONLINE_MEMBERS in {HUB_JSX}")

    # Accept single or double quoted names
    names = re.findall(r"""['"]([^'"]+)['"]""", match.group(1))
    return set(names)


def refresh_online():
    # ── 1. Read which members are online from Hub.jsx ────────────────────────
    online_names = parse_online_members()
    print(f"Online members ({len(online_names)}): {', '.join(sorted(online_names))}\n")

    # ── 2. Load existing members.json so offline entries are preserved ───────
    members_file = output_dir / "members.json"
    if members_file.exists():
        with open(members_file, 'r', encoding='utf-8') as f:
            all_members = json.load(f)
    else:
        print("WARNING: members.json not found — run generate_data.py first.")
        all_members = []

    # Index by data_file for fast in-place updates
    members_by_file = {m['data_file']: m for m in all_members}

    # ── 3. Scan and regenerate only the online member directories ────────────
    root_path = pathlib.Path(root_dir)
    updated   = 0
    not_found = set(online_names.copy())  # track which ones we actually find on disk

    for group_dir in sorted(root_path.iterdir()):
        if not group_dir.is_dir():
            continue
        for member_dir in sorted(group_dir.iterdir()):
            if not member_dir.is_dir():
                continue
            if member_dir.name not in online_names:
                continue

            print(f"  Refreshing: {group_dir.name} / {member_dir.name} …")
            entry = process_member_dir(root_path, member_dir)
            members_by_file[entry['data_file']] = entry
            not_found.discard(member_dir.name)
            updated += 1

    if not_found:
        print(f"\n  WARNING: The following ONLINE_MEMBERS were not found on disk: {not_found}")

    # ── 4. Rebuild members.json preserving all entries, re-sorted ────────────
    all_members = sorted(members_by_file.values(), key=lambda m: m['last_timestamp'], reverse=True)
    with open(members_file, 'w', encoding='utf-8') as f:
        json.dump(all_members, f, indent=4, ensure_ascii=False)

    print(f"\nDone! Refreshed {updated} online member(s). Offline members left untouched.")


if __name__ == "__main__":
    refresh_online()
