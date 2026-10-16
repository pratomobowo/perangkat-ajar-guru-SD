"""Ringkas log JSON `opencode run --format json` (OpenCode 1 dan 2) menjadi transkrip yang mudah dibaca."""
import json
import re
import sys


def ringkas_input(tool, inp):
    if tool == "skill":
        return inp.get("name") or inp.get("id") or json.dumps(inp, ensure_ascii=False)
    if tool in ("read", "write", "edit", "patch"):
        path = inp.get("filePath") or inp.get("path") or ""
        return re.split(r"/(?:PerangkatAjar|AsistenGuru)/", path.replace("\\", "/"))[-1]
    if tool in ("bash", "shell"):
        return inp.get("command", "")[:160]
    if tool in ("glob", "grep", "list"):
        return json.dumps(inp, ensure_ascii=False)[:160]
    return json.dumps(inp, ensure_ascii=False)[:160]


def main(path):
    skills, writes = [], []
    for line in open(path, encoding="utf-8"):
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        part = ev.get("part", {})
        if ev["type"] == "text":
            print(f"\n[ASISTEN]\n{part.get('text', '').strip()}\n")
        elif ev["type"] == "tool_use":
            tool = part.get("tool")
            st = part.get("state", {})
            inp = st.get("input", {})
            arg = ringkas_input(tool, inp)
            mark = "✔" if st.get("status") == "completed" else "✖"
            print(f"  {mark} {tool}: {arg}")
            if tool == "skill":
                skills.append(arg)
            if tool in ("write", "edit", "patch") and st.get("status") == "completed":
                writes.append(arg)
        elif ev["type"] == "error":
            print(f"  !! ERROR: {json.dumps(ev.get('error', ev), ensure_ascii=False)[:300]}")
    print("\n--- ringkasan ---")
    print("skill dimuat :", ", ".join(skills) or "(tidak ada)")
    print("berkas ditulis:", ", ".join(writes) or "(tidak ada)")


if __name__ == "__main__":
    main(sys.argv[1])
