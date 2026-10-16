// Mencetak HTML ke PDF dengan peramban yang sudah ada di komputer guru (Microsoft Edge di Windows 10/11, atau Chrome),
// dijalankan tanpa tampilan. Tidak ada yang diunduh atau dipasang. Jika peramban tidak ditemukan, HTML tetap tersimpan
// dan guru bisa membukanya lalu Ctrl+P → Simpan sebagai PDF.

import { spawn } from "node:child_process"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { delimiter, join } from "node:path"
import { pathToFileURL } from "node:url"

function kandidat(): string[] {
  const env = process.env
  const out: string[] = []
  if (env.ASISTEN_GURU_PERAMBAN) out.push(env.ASISTEN_GURU_PERAMBAN)
  if (process.platform === "win32") {
    for (const akar of [env["ProgramFiles(x86)"], env.ProgramFiles, env.LOCALAPPDATA].filter(Boolean) as string[]) {
      out.push(join(akar, "Microsoft", "Edge", "Application", "msedge.exe"))
      out.push(join(akar, "Google", "Chrome", "Application", "chrome.exe"))
    }
  } else if (process.platform === "darwin") {
    out.push("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium")
  }
  for (const d of (env.PATH ?? "").split(delimiter))
    for (const n of ["msedge", "microsoft-edge", "google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome-headless-shell"]) out.push(join(d, n))
  return out
}

export function cariPeramban(): string | null {
  return kandidat().find((p) => p && existsSync(p)) ?? null
}

/** HTML → PDF. Mengembalikan nama peramban yang dipakai, atau null jika tidak ada/gagal. */
export async function htmlKePdf(html: string, pdf: string, batasMs = 90000): Promise<{ peramban: string } | null> {
  const exe = cariPeramban()
  if (!exe) return null
  // Profil sementara supaya tidak bentrok dengan Edge/Chrome yang sedang dibuka guru.
  const profil = mkdtempSync(join(tmpdir(), "asisten-guru-cetak-"))
  try {
    const args = ["--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions",
      `--user-data-dir=${profil}`, "--no-pdf-header-footer", "--print-to-pdf-no-header", `--print-to-pdf=${pdf}`, pathToFileURL(html).href]
    // Chrome menolak berjalan sebagai root tanpa sandbox dimatikan (hanya terjadi di server Linux, bukan laptop guru).
    if (process.platform === "linux" && process.getuid?.() === 0) args.unshift("--no-sandbox")
    const ok = await new Promise<boolean>((selesai) => {
      const p = spawn(exe, args, { stdio: "ignore", windowsHide: true })
      const t = setTimeout(() => { p.kill(); selesai(false) }, batasMs)
      p.on("error", () => { clearTimeout(t); selesai(false) })
      p.on("exit", () => { clearTimeout(t); selesai(true) })
    })
    return ok && existsSync(pdf) ? { peramban: exe.split(/[\\/]/).pop()! } : null
  } finally {
    try { rmSync(profil, { recursive: true, force: true }) } catch {}
  }
}
