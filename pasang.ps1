# Pemasang dan pembaru Asisten Guru untuk Windows (OpenCode 2).
# Pakai (PowerShell, cmd, atau terminal OpenCode):
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/pratomobowo/perangkat-ajar-guru-SD/main/pasang.ps1 | iex"
# Hanya memakai fitur bawaan Windows PowerShell 5.1; tidak perlu git, Node.js, atau Python.
#
# Aturan (sama dengan .opencode/lib/paket.ts):
# - .opencode\ dan berkas paket di akar diganti versi baru; yang lama dicadangkan di .cadangan\.
# - sekolah\ hanya ditambah berkas yang belum ada. guru\ dan hasil\ tidak pernah disentuh.
# Opsional: $env:ASISTEN_GURU_DIR (folder tujuan), $env:ASISTEN_GURU_ZIP (berkas/URL zip, untuk uji).

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

$Repo = 'pratomobowo/perangkat-ajar-guru-SD'
$BerkasAkar = @('AGENTS.md', 'opencode.json', 'PANDUAN-GURU.md', 'README-PASANG.md', 'VERSI.md')
$Diabaikan = '^\.opencode/(node_modules/|package\.json$|package-lock\.json$|bun\.lock$|\.gitignore$)'

function Tulis([string]$Pesan) { Write-Host "[Asisten Guru] $Pesan" }

if ($env:ASISTEN_GURU_DIR) { $Tujuan = $env:ASISTEN_GURU_DIR }
else {
    $Dokumen = [Environment]::GetFolderPath('MyDocuments')
    if (-not $Dokumen) {
        $Rumah = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }
        $Dokumen = Join-Path $Rumah 'Documents'
    }
    $Tujuan = Join-Path $Dokumen 'AsistenGuru'
}
$Tujuan = [IO.Path]::GetFullPath($Tujuan)

$Kerja = Join-Path ([IO.Path]::GetTempPath()) ("asisten-guru-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $Kerja | Out-Null
try {
    # 1. Unduh rilis terbaru (tag vX.Y.Z).
    $Zip = Join-Path $Kerja 'paket.zip'
    if ($env:ASISTEN_GURU_ZIP -and (Test-Path $env:ASISTEN_GURU_ZIP)) {
        Copy-Item $env:ASISTEN_GURU_ZIP $Zip
    } else {
        $Url = $env:ASISTEN_GURU_ZIP
        if (-not $Url) {
            $Tags = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/tags?per_page=100" -Headers @{ 'User-Agent' = 'asisten-guru' }
            $Tag = $Tags | Where-Object { $_.name -match '^v\d+\.\d+\.\d+$' } |
                Sort-Object { [version]($_.name.Substring(1)) } -Descending | Select-Object -First 1
            if (-not $Tag) { throw 'Belum ada rilis Asisten Guru di GitHub.' }
            $Url = "https://github.com/$Repo/archive/refs/tags/$($Tag.name).zip"
        }
        Tulis "Mengunduh $Url"
        Invoke-WebRequest -Uri $Url -OutFile $Zip -UseBasicParsing -Headers @{ 'User-Agent' = 'asisten-guru' }
    }

    # 2. Ekstrak dan temukan folder AsistenGuru di dalam arsip.
    $Ekstrak = Join-Path $Kerja 'isi'
    Expand-Archive -Path $Zip -DestinationPath $Ekstrak -Force
    $Sumber = Get-ChildItem -Path $Ekstrak -Recurse -Directory -Filter 'AsistenGuru' |
        Where-Object { Test-Path (Join-Path $_.FullName 'opencode.json') } | Select-Object -First 1
    if (-not $Sumber) { throw 'Arsip yang diunduh bukan paket Asisten Guru.' }
    $Sumber = $Sumber.FullName
    $VersiBaru = (Get-Content -Raw (Join-Path $Sumber '.opencode/paket.json') | ConvertFrom-Json).versi

    function Daftar([string]$Akar) {
        if (-not (Test-Path $Akar)) { return @() }
        Get-ChildItem -Path $Akar -Recurse -File -Force | ForEach-Object {
            $_.FullName.Substring($Akar.Length).TrimStart('\', '/').Replace('\', '/')
        }
    }
    $Baru = @(Daftar $Sumber)

    # 3. Cadangkan berkas paket lama.
    $VersiLama = $null
    $PaketLama = Join-Path $Tujuan '.opencode/paket.json'
    if (Test-Path $PaketLama) { try { $VersiLama = (Get-Content -Raw $PaketLama | ConvertFrom-Json).versi } catch {} }
    $Lama = @()
    if (Test-Path (Join-Path $Tujuan '.opencode')) {
        $Lama += @(Daftar (Join-Path $Tujuan '.opencode') | ForEach-Object { ".opencode/$_" } | Where-Object { $_ -notmatch $Diabaikan })
    }
    $Lama += @($BerkasAkar | Where-Object { Test-Path (Join-Path $Tujuan $_) })
    $Cadangan = $null
    if ($Lama.Count -gt 0) {
        $Label = if ($VersiLama) { "v$VersiLama" } else { 'vlama' }
        $Cadangan = ".cadangan/" + (Get-Date -Format 'yyyy-MM-dd HHmmss') + " $Label"
        foreach ($Rel in $Lama) {
            $Ke = Join-Path (Join-Path $Tujuan $Cadangan) $Rel
            New-Item -ItemType Directory -Force -Path (Split-Path $Ke) | Out-Null
            Copy-Item -LiteralPath (Join-Path $Tujuan $Rel) -Destination $Ke -Force
        }
        $Semua = @(Get-ChildItem -Path (Join-Path $Tujuan '.cadangan') -Directory | Sort-Object Name)
        if ($Semua.Count -gt 3) { $Semua[0..($Semua.Count - 4)] | Remove-Item -Recurse -Force }
    }

    # 4. Salin berkas baru sesuai aturan.
    $Ditulis = 0; $SekolahBaru = @()
    foreach ($Rel in $Baru) {
        $Dari = Join-Path $Sumber $Rel
        $Ke = Join-Path $Tujuan $Rel
        $Ada = Test-Path -LiteralPath $Ke
        if ($Rel -like 'guru/*' -or $Rel -like 'hasil/*') {
            if (-not $Ada) { New-Item -ItemType Directory -Force -Path (Split-Path $Ke) | Out-Null; Copy-Item -LiteralPath $Dari -Destination $Ke }
            continue
        }
        if ($Rel -like '*/*' -and $Rel -notlike '.opencode/*') {
            if ($Ada) { continue }
            $SekolahBaru += $Rel
        }
        New-Item -ItemType Directory -Force -Path (Split-Path $Ke) | Out-Null
        Copy-Item -LiteralPath $Dari -Destination $Ke -Force
        $Ditulis++
    }

    # 5. Hapus berkas paket lama yang tidak ada di versi baru, lalu folder kosong di .opencode.
    $Dihapus = 0
    foreach ($Rel in $Lama) {
        if ($Baru -notcontains $Rel) { Remove-Item -LiteralPath (Join-Path $Tujuan $Rel) -Force; $Dihapus++ }
    }
    Get-ChildItem -Path (Join-Path $Tujuan '.opencode') -Recurse -Directory -Force | Sort-Object { $_.FullName.Length } -Descending |
        Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Force) } | Remove-Item -Force

    # 6. Laporan untuk guru dan asisten AI.
    if ($VersiLama) { Tulis "Diperbarui dari versi $VersiLama ke $VersiBaru di: $Tujuan" }
    else { Tulis "Terpasang versi $VersiBaru di: $Tujuan" }
    Tulis "$Ditulis berkas paket ditulis, $Dihapus berkas lama dihapus."
    if ($Cadangan) { Tulis "Berkas paket lama dicadangkan di $Cadangan" }
    if ($SekolahBaru.Count) { Tulis ("Berkas sekolah baru: " + ($SekolahBaru -join ', ')) }
    Tulis 'Data guru, hasil, dan isian sekolah tidak diubah.'
    $Oc = Get-Command opencode -ErrorAction SilentlyContinue
    if ($Oc) {
        $V = (& opencode --version 2>$null | Out-String).Trim()
        if ($V -match 'v?1\.') { Tulis "PERHATIAN: OpenCode $V terdeteksi. Asisten Guru butuh OpenCode 2. Pasang dari https://opencode.ai/download" }
    }
    Tulis 'Langkah berikutnya: buka folder di atas sebagai proyek di OpenCode (Desktop: Open Project; terminal: cd ke folder itu lalu ketik opencode), lalu ketik /mulai.'
    Write-Output "ASISTEN_GURU_SELESAI versi=$VersiBaru folder=$Tujuan"
}
finally {
    Remove-Item -Recurse -Force $Kerja -ErrorAction SilentlyContinue
}
