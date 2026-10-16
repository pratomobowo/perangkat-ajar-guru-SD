// Interaksi media di peramban: navigasi layar, pewaktu, papan skor, suara, konfeti, dan semua komponen interaktif
// (kartu kilat, kuis, pasangkan/memori, urutkan, roda, bingo, ular tangga, peraga 2D). Peraga 3D ada di tiga.js.
// Bergantung pada fungsi gambar(), svgJam(), dst. dari gambar.js yang disisipkan sebelum berkas ini.
// Tidak memakai internet, tidak menyimpan data murid.
;(function () {
  "use strict"
  const SPEK = JSON.parse(document.getElementById("spek-media").textContent)
  const body = document.body

  // ---------- Pembantu DOM ----------
  function h(tag, props, ...anak) {
    const el = document.createElement(tag)
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue
      if (k === "class") el.className = v
      else if (k === "html") el.innerHTML = v
      else if (k === "text") el.textContent = v
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v)
      else el.setAttribute(k, v === true ? "" : v)
    }
    for (const a of anak.flat(3)) if (a != null && a !== false) el.append(a.nodeType ? a : document.createTextNode(String(a)))
    return el
  }
  /** append yang membuang null/false/0 dan meratakan daftar (supaya `syarat && elemen` aman dipakai). */
  const tambah = (el, ...xs) => el.append(...xs.flat(3).filter((x) => x != null && x !== false && x !== 0))
  const tombol = (label, onclick, kelas = "") => h("button", { class: `tombol ${kelas}`, type: "button", onclick }, label)
  const acakArr = (xs) => {
    const a = [...xs]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const kocok = (el) => { el.classList.remove("goyang"); void el.offsetWidth; el.classList.add("goyang") }
  const denyut = (el) => { el.classList.remove("denyut"); void el.offsetWidth; el.classList.add("denyut") }
  const isiHtml = (k) => `${k.teks != null ? `<div class="teks">${esc(k.teks)}</div>` : ""}${k.gambar ? `<div class="gbr">${gambar(k.gambar)}</div>` : ""}${k.keterangan ? `<div class="ket">${esc(k.keterangan)}</div>` : ""}`
  const svgTitik = (svg, e) => {
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    return p.matrixTransform(svg.getScreenCTM().inverse())
  }

  // ---------- Suara (dibuat di peramban, tanpa berkas audio) ----------
  let audio = null
  let suaraNyala = true
  function nada(f, mulai, lama, jenis = "sine", vol = 0.18) {
    if (!suaraNyala) return
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)()
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + mulai
      o.type = jenis
      o.frequency.value = f
      g.gain.setValueAtTime(vol, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + lama)
      o.connect(g).connect(audio.destination)
      o.start(t)
      o.stop(t + lama)
    } catch (e) {}
  }
  const bunyi = {
    benar: () => { nada(523, 0, 0.15); nada(659, 0.1, 0.15); nada(784, 0.2, 0.3) },
    salah: () => { nada(196, 0, 0.3, "square", 0.08) },
    klik: () => nada(880, 0, 0.06, "triangle", 0.1),
    menang: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => nada(f, i * 0.12, 0.25)),
    alarm: () => [0, 0.3, 0.6, 0.9].forEach((t) => nada(988, t, 0.2, "square", 0.08)),
  }

  // ---------- Konfeti ----------
  function konfeti() {
    let c = document.getElementById("konfeti")
    if (!c) { c = h("canvas", { id: "konfeti" }); body.append(c) }
    const ctx = c.getContext("2d")
    c.width = innerWidth
    c.height = innerHeight
    const warna = ["#2F6FDE", "#2E9E5B", "#FFC83D", "#D64545", "#7B5CD6", "#F28C28"]
    const p = Array.from({ length: 160 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4, r: Math.random() * 6.28, w: 6 + Math.random() * 8, c: warna[Math.floor(Math.random() * warna.length)] }))
    const mulai = performance.now()
    ;(function langkah(t) {
      ctx.clearRect(0, 0, c.width, c.height)
      for (const q of p) {
        q.x += q.vx; q.y += q.vy; q.vy += 0.05; q.r += 0.1
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.c; ctx.fillRect(-q.w / 2, -q.w / 4, q.w, q.w / 2); ctx.restore()
      }
      if (t - mulai < 3200) requestAnimationFrame(langkah)
      else ctx.clearRect(0, 0, c.width, c.height)
    })(mulai)
  }

  // ---------- Modal ----------
  function modal(isi, tombolList) {
    const panel = h("div", { class: "panel" }, isi, h("div", { class: "baris-tombol", style: "justify-content:center" }, ...tombolList.map(([l, f, k]) => tombol(l, () => { if (f?.() !== false) tutup() }, k))))
    const m = h("div", { class: "modal" }, panel)
    const tutup = () => m.remove()
    body.append(m)
    return { tutup, panel }
  }

  // ---------- Navigasi layar dan alat atas ----------
  const layar = [...document.querySelectorAll("section.layar")]
  let aktif = 0
  function tampil(i) {
    aktif = Math.max(0, Math.min(layar.length - 1, i))
    layar.forEach((s, k) => s.classList.toggle("aktif", k === aktif))
    nav.querySelectorAll(".daftar button").forEach((b, k) => b.classList.toggle("aktif", k === aktif))
    nav.querySelector(".daftar button.aktif")?.scrollIntoView({ block: "nearest", inline: "center" })
    layar[aktif].dispatchEvent(new CustomEvent("tampil"))
    try { history.replaceState(null, "", `#layar-${aktif + 1}`) } catch (e) {}
    scrollTo(0, 0)
  }
  const NAMA = { kuis: "Kuis", kartu: "Kartu", pasangkan: "Pasangkan", urutkan: "Urutkan", roda: "Roda", bingo: "Bingo", ular_tangga: "Ular Tangga", peraga: "Peraga", ruang: "Bangun Ruang", volume: "Volume", domino: "Domino", gambar: "Gambar", teks: "Materi" }
  const nav = h("nav", { class: "navigasi" },
    tombol("◀", () => tampil(aktif - 1), "kedua"),
    h("div", { class: "daftar" }, layar.map((s, k) => h("button", { type: "button", onclick: () => tampil(k) }, `${k + 1}. ${s.querySelector("h2")?.textContent || NAMA[s.dataset.jenis] || "Bagian"}`))),
    tombol("▶", () => tampil(aktif + 1)),
  )
  if (layar.length > 1) body.append(nav)
  else body.style.paddingBottom = "16px"
  document.addEventListener("keydown", (e) => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return
    if (e.key === "ArrowRight" || e.key === "PageDown") tampil(aktif + 1)
    if (e.key === "ArrowLeft" || e.key === "PageUp") tampil(aktif - 1)
  })

  // Pewaktu kelas
  let pewaktu = null
  function bukaPewaktu() {
    if (pewaktu) { pewaktu.remove(); pewaktu = null; return }
    let sisa = 180, jalan = null
    const waktu = h("div", { class: "waktu" })
    const tulis = () => { waktu.textContent = `${String(Math.floor(sisa / 60)).padStart(2, "0")}:${String(sisa % 60).padStart(2, "0")}`; waktu.classList.toggle("habis", sisa === 0) }
    const henti = () => { clearInterval(jalan); jalan = null }
    const atur = (d) => { henti(); sisa = d; tulis() }
    pewaktu = h("div", { class: "pewaktu" }, waktu,
      h("div", { class: "baris-tombol", style: "justify-content:center" }, ...[1, 3, 5, 10].map((m) => tombol(`${m}′`, () => atur(m * 60), "kedua"))),
      h("div", { class: "baris-tombol", style: "justify-content:center" },
        tombol("▶", () => { if (jalan || !sisa) return; jalan = setInterval(() => { sisa--; tulis(); if (sisa <= 0) { henti(); bunyi.alarm() } }, 1000) }, "hijau"),
        tombol("⏸", henti, "oranye"),
        tombol("✕", bukaPewaktu, "merah")))
    tulis()
    body.append(pewaktu)
  }
  // Papan skor tim (tanpa nama murid)
  let papanSkor = null
  function bukaSkor() {
    if (papanSkor) { papanSkor.remove(); papanSkor = null; return }
    const warna = ["#2F6FDE", "#D64545", "#2E9E5B", "#F28C28"]
    papanSkor = h("div", { class: "papan-skor" }, ...warna.map((w, k) => {
      let n = 0
      const b = h("b", {}, "0")
      return h("div", { class: "t", style: `background:${w}` }, `Tim ${k + 1}`, b,
        h("button", { type: "button", onclick: () => { n = Math.max(0, n - 1); b.textContent = n } }, "−"), " ",
        h("button", { type: "button", onclick: () => { n++; b.textContent = n; bunyi.klik() } }, "+"))
    }))
    body.append(papanSkor)
  }
  const tbSuara = h("button", { type: "button", title: "Suara", onclick: () => { suaraNyala = !suaraNyala; tbSuara.textContent = suaraNyala ? "🔊" : "🔇"; tbSuara.classList.toggle("mati", !suaraNyala) } }, "🔊")
  const alatAtas = h("div", { class: "alat-atas" },
    h("button", { type: "button", title: "Pewaktu", onclick: bukaPewaktu }, "⏱"),
    h("button", { type: "button", title: "Skor tim", onclick: bukaSkor }, "🏆"),
    tbSuara,
    h("button", { type: "button", title: "Layar penuh", onclick: () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() } catch (e) {} } }, "⤢"),
    h("button", { type: "button", title: "Cetak", onclick: () => print() }, "🖨"),
  )
  document.querySelector("header.atas").append(alatAtas)

  // ---------- Komponen ----------
  const K = {}

  K.kartu = (el, b) => {
    let urut = b.kartu.map((_, i) => i), satu = false, k = 0
    const adaBalik = b.kartu.some((x) => x.balik)
    const kartuEl = (x) => {
      const c = h("div", { class: "kk" }, h("div", { class: "dalam" }, h("div", { class: "muka depan", html: isiHtml(x) + (x.balik ? '<span class="tanda">ketuk ↻</span>' : "") }), h("div", { class: "muka belakang", html: x.balik ? isiHtml(x.balik) : "" })))
      c.onclick = () => { if (x.balik) { c.classList.toggle("balik"); bunyi.klik() } else denyut(c) }
      return c
    }
    const wadah = h("div")
    const tbMode = tombol("▶ Satu per satu", () => { satu = !satu; k = 0; gambarUlang() }, "ungu")
    function gambarUlang() {
      tbMode.textContent = satu ? "▦ Semua kartu" : "▶ Satu per satu"
      wadah.replaceChildren()
      if (!satu) return wadah.append(h("div", { class: "kk-grid" }, urut.map((i) => kartuEl(b.kartu[i]))))
      wadah.append(h("div", { class: "kk-satu" }, kartuEl(b.kartu[urut[k]]),
        h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("◀", () => { k = (k - 1 + urut.length) % urut.length; gambarUlang() }, "kedua"), h("span", { class: "info" }, `${k + 1} / ${urut.length}`), tombol("▶", () => { k = (k + 1) % urut.length; gambarUlang() }))))
    }
    el.append(h("div", { class: "baris-tombol" }, tbMode, tombol("🔀 Acak", () => { urut = acakArr(urut); k = 0; gambarUlang() }, "kedua"), adaBalik && tombol("↺ Tutup semua", () => el.querySelectorAll(".kk.balik").forEach((c) => c.classList.remove("balik")), "kedua")), wadah)
    gambarUlang()
  }

  const normal = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim()
  const samaJawab = (a, b) => {
    const x = normal(a), y = normal(b)
    if (x === y) return true
    const angka = (s) => (/^-?\d+([.,]\d+)?$/.test(s.replace(/\s/g, "")) ? Number(s.replace(/\s/g, "").replace(",", ".")) : NaN)
    const p = angka(x), q = angka(y)
    return !isNaN(p) && p === q
  }

  K.kuis = (el, b) => {
    let urut, k, skor, terjawab
    function mulai() { urut = b.acak ? acakArr(b.soal.map((_, i) => i)) : b.soal.map((_, i) => i); k = 0; skor = 0; gambarUlang() }
    function gambarUlang() {
      el.replaceChildren()
      const n = urut.length
      if (k >= n) {
        const persen = skor / n
        const bintang = persen >= 0.9 ? 3 : persen >= 0.6 ? 2 : persen > 0 ? 1 : 0
        el.append(h("div", { class: "kuis panel skor-akhir" }, h("div", { class: "bintang" }, "★".repeat(bintang) + "☆".repeat(3 - bintang)), h("div", { class: "besar" }, `${skor} / ${n}`), h("p", {}, persen >= 0.9 ? "Luar biasa! 🎉" : persen >= 0.6 ? "Bagus! Terus berlatih 👍" : "Ayo coba lagi, pasti bisa! 💪"), h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("↺ Ulangi", mulai))))
        if (persen >= 0.6) { konfeti(); bunyi.menang() }
        el.dataset.selesai = `${skor}/${n}`
        return
      }
      const q = b.soal[urut[k]]
      terjawab = false
      const umpan = h("div")
      const lanjut = h("div", { class: "baris-tombol" })
      const kotak = h("div", { class: "kuis" },
        h("div", { class: "kepala" }, h("span", {}, `Soal ${k + 1} dari ${n}`), h("span", {}, `⭐ ${skor}`)),
        h("div", { class: "bar" }, h("div", { style: `width:${(k / n) * 100}%` })),
        h("div", { class: "tanya" }, q.tanya),
        q.gambar && h("div", { class: "gbr", html: gambar(q.gambar) }))
      const selesai = (benar, teksJawab) => {
        terjawab = true
        if (benar) { skor++; bunyi.benar() } else bunyi.salah()
        umpan.replaceChildren(h("div", { class: `umpan ${benar ? "ya" : "tidak"}` }, benar ? "✔ Benar!" : `✖ Belum tepat. Jawaban: ${teksJawab}`, q.bahas && h("div", { class: "bahas" }, q.bahas)))
        lanjut.replaceChildren(tombol(k + 1 < n ? "Berikutnya ▶" : "Lihat skor 🏁", () => { k++; gambarUlang() }, "hijau"))
      }
      if (q.pilihan) {
        const tbs = q.pilihan.map((p, j) => h("button", { type: "button", "data-j": j, onclick: () => {
          if (terjawab) return
          tbs[q.benar].classList.add("benar")
          if (j !== q.benar) { tbs[j].classList.add("salah"); kocok(tbs[j]) }
          selesai(j === q.benar, `${"ABCDEF"[q.benar]}. ${q.pilihan[q.benar]}`)
        } }, h("span", { class: "huruf" }, "ABCDEF"[j]), h("span", {}, p)))
        kotak.append(h("div", { class: "pilihan" }, tbs))
      } else {
        let coba = 0
        const inp = h("input", { class: "jawab", type: "text", inputmode: "text", autocomplete: "off", placeholder: "Ketik jawaban…" })
        const periksa = () => {
          if (terjawab || !inp.value.trim()) return
          if (q.jawaban.some((j) => samaJawab(inp.value, j))) return selesai(coba === 0, q.jawaban[0])
          coba++
          kocok(inp)
          bunyi.salah()
          umpan.replaceChildren(h("div", { class: "umpan tidak" }, "Belum tepat, coba lagi!"))
          lanjut.replaceChildren(tombol("👁 Lihat jawaban", () => selesai(false, q.jawaban[0]), "kedua"))
        }
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") periksa() })
        kotak.append(h("div", { class: "baris-tombol" }, inp, tombol("Periksa ✔", periksa, "hijau")))
      }
      kotak.append(umpan, lanjut)
      el.append(kotak)
    }
    mulai()
  }

  K.pasangkan = (el, b) => {
    const n = b.pasangan.length
    function mulai() {
      el.replaceChildren()
      let cocok = 0, salah = 0
      const info = h("div", { class: "info" })
      const tulisInfo = () => (info.textContent = `Pasangan benar: ${cocok} / ${n}${salah ? ` · salah: ${salah}` : ""}`)
      const beres = () => { el.dataset.selesai = "1"; konfeti(); bunyi.menang(); info.textContent = `Hebat! Semua ${n} pasangan benar 🎉` }
      if (b.mode === "memori") {
        let buka = [], kunci = false, langkah = 0
        const kartu = acakArr(b.pasangan.flatMap((p, i) => [{ i, x: p[0] }, { i, x: p[1] }]))
        const els = kartu.map((c) => {
          const e = h("div", { class: "kk", "data-pasangan": c.i }, h("div", { class: "dalam" }, h("div", { class: "muka depan" }, "?"), h("div", { class: "muka belakang", html: isiHtml(c.x) })))
          e.onclick = () => {
            if (kunci || e.classList.contains("balik")) return
            e.classList.add("balik"); bunyi.klik(); buka.push(e)
            if (buka.length < 2) return
            langkah++
            const [a, z] = buka
            buka = []
            if (a.dataset.pasangan === z.dataset.pasangan) {
              a.classList.add("cocok"); z.classList.add("cocok"); cocok++; bunyi.benar(); tulisInfo()
              if (cocok === n) { beres(); info.textContent += ` (${langkah} langkah)` }
            } else {
              kunci = true; salah++
              setTimeout(() => { a.classList.remove("balik"); z.classList.remove("balik"); kunci = false; tulisInfo() }, 1000)
            }
          }
          return e
        })
        el.append(h("div", { class: "baris-tombol" }, info, tombol("↺ Ulangi", mulai, "kedua")), h("div", { class: "memori" }, els))
        tulisInfo()
        return
      }
      let pilih = null
      const ubin = (sisi, i, x) => {
        const e = h("div", { class: "ubin", "data-sisi": sisi, "data-pasangan": i, html: isiHtml(x) })
        e.onclick = () => {
          if (e.classList.contains("cocok")) return
          if (!pilih || pilih.dataset.sisi === sisi) { pilih?.classList.remove("pilih"); pilih = e; e.classList.add("pilih"); bunyi.klik(); return }
          const a = pilih
          pilih = null
          a.classList.remove("pilih")
          if (a.dataset.pasangan === e.dataset.pasangan) {
            cocok++
            for (const u of [a, e]) { u.classList.add("cocok"); u.dataset.no = cocok }
            bunyi.benar(); tulisInfo()
            if (cocok === n) beres()
          } else { salah++; kocok(a); kocok(e); bunyi.salah(); tulisInfo() }
        }
        return e
      }
      el.append(h("div", { class: "baris-tombol" }, info, tombol("↺ Ulangi", mulai, "kedua")),
        h("div", { class: "pasang" }, h("div", { class: "kolom" }, acakArr(b.pasangan.map((p, i) => ubin("kiri", i, p[0])))), h("div", { class: "kolom" }, acakArr(b.pasangan.map((p, i) => ubin("kanan", i, p[1]))))))
      tulisInfo()
    }
    mulai()
  }

  K.urutkan = (el, b) => {
    function mulai() {
      el.replaceChildren()
      let k = 0
      const hasil = h("div", { class: "urut-hasil" })
      const sumber = h("div", { class: "urut-sumber" })
      let urut = acakArr(b.item.map((_, i) => i))
      if (urut.every((v, i) => v === i)) urut = urut.reverse()
      for (const i of urut) {
        const e = h("div", { class: "ubin", "data-i": i, html: isiHtml(b.item[i]) })
        e.onclick = () => {
          if (e.parentNode === hasil) return
          if (i !== k) { kocok(e); bunyi.salah(); return }
          k++; e.dataset.no = k; hasil.append(e); bunyi.benar()
          if (k === b.item.length) { el.dataset.selesai = "1"; konfeti(); bunyi.menang() }
        }
        sumber.append(e)
      }
      el.append(h("div", { class: "baris-tombol" }, tombol("↺ Ulangi", mulai, "kedua"), tombol("👁 Lihat urutan benar", () => {
        ;[...sumber.children].sort((a, z) => a.dataset.i - z.dataset.i).forEach((e) => { e.dataset.no = Number(e.dataset.i) + 1; hasil.append(e) })
        ;[...hasil.children].sort((a, z) => a.dataset.i - z.dataset.i).forEach((e) => hasil.append(e))
        k = b.item.length
      }, "kedua")), hasil, sumber)
    }
    mulai()
  }

  K.roda = (el, b) => {
    let isi = b.absen ? Array.from({ length: b.absen }, (_, i) => String(i + 1)) : [...b.isi]
    let putaran = 0, berputar = false
    const warna = ["#2F6FDE", "#F28C28", "#2E9E5B", "#D64545", "#7B5CD6", "#00A3B4", "#E0A800", "#C2185B"]
    const hasil = h("div", { class: "besar" }, "")
    const hapus = h("input", { type: "checkbox" })
    const wadah = h("div", { class: "wadah" })
    let svg
    function gambarRoda() {
      const n = isi.length, r = 100, sudut = 360 / n
      const p = (d) => [(r + r * Math.sin((d * Math.PI) / 180)).toFixed(2), (r - r * Math.cos((d * Math.PI) / 180)).toFixed(2)]
      const fs = Math.max(6, Math.min(16, 140 / n, 220 / Math.max(...isi.map((s) => s.length)) / 1.2))
      const seg = isi.map((s, k) => {
        const [x1, y1] = p(k * sudut), [x2, y2] = p((k + 1) * sudut)
        const tengah = k * sudut + sudut / 2
        const w = warna[k % warna.length === 0 && k === n - 1 && n > 1 ? 1 : k % warna.length]
        const bentuk = n === 1 ? `<circle cx="100" cy="100" r="100" fill="${w}"/>` : `<path d="M100 100 L${x1} ${y1} A100 100 0 ${sudut > 180 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${w}" stroke="#fff" stroke-width="1"/>`
        return `${bentuk}<text transform="rotate(${tengah} 100 100)" x="100" y="${28 + fs / 2}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="#fff">${esc(s.length > 14 ? s.slice(0, 13) + "…" : s)}</text>`
      })
      wadah.innerHTML = `<div class="jarum"></div><svg viewBox="-4 -4 208 208"><g class="cakram" style="transform-origin:100px 100px;transition:transform 4.2s cubic-bezier(.12,.67,.12,1);transform:rotate(${putaran}deg)">${seg.join("")}</g><circle cx="100" cy="100" r="14" fill="#fff" stroke="#1E2533" stroke-width="3"/></svg>`
      svg = wadah.querySelector(".cakram")
    }
    function putar() {
      if (berputar || !isi.length) return
      berputar = true
      hasil.textContent = "…"
      putaran += 360 * (5 + Math.floor(Math.random() * 3)) + Math.random() * 360
      svg.style.transform = `rotate(${putaran}deg)`
      const tik = setInterval(() => nada(1200, 0, 0.03, "triangle", 0.05), 120)
      setTimeout(() => {
        clearInterval(tik)
        const n = isi.length, sudut = (360 - (putaran % 360)) % 360
        const k = Math.floor(sudut / (360 / n)) % n
        const terpilih = isi[k]
        hasil.textContent = terpilih
        el.dataset.terpilih = terpilih
        bunyi.menang()
        berputar = false
        if (hapus.checked && isi.length > 1) {
          setTimeout(() => { isi.splice(k, 1); putaran = 0; gambarRoda() }, 1200)
        }
      }, 4300)
    }
    gambarRoda()
    el.append(h("div", { class: "roda" }, wadah, h("div", { class: "panel hasil" }, h("div", {}, b.absen ? "Nomor absen:" : "Terpilih:"), hasil, h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("🎡 Putar!", putar, "ungu")), h("label", {}, hapus, " Hapus yang sudah terpilih"), h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("↺ Isi ulang", () => { isi = b.absen ? Array.from({ length: b.absen }, (_, i) => String(i + 1)) : [...b.isi]; putaran = 0; hasil.textContent = ""; gambarRoda() }, "kedua")))))
  }

  K.bingo = (el, b) => {
    let tumpuk, riwayat, lihat = false
    const besar = h("div", { class: "besar" }, "?")
    const jawab = h("div", { class: "info" })
    const rw = h("div", { class: "riwayat" })
    const sisa = h("div", { class: "kecil" })
    function mulai() { tumpuk = acakArr(b.isi); riwayat = []; besar.textContent = "?"; jawab.textContent = ""; rw.replaceChildren(); sisa.textContent = `${tumpuk.length} kartu panggilan` }
    function ambil() {
      if (!tumpuk.length) { besar.textContent = "Habis!"; return }
      const x = tumpuk.pop()
      riwayat.push(x)
      besar.textContent = x.soal ?? x.jawaban
      jawab.textContent = x.soal && lihat ? `Jawaban: ${x.jawaban}` : ""
      jawab.dataset.jawaban = x.jawaban
      rw.prepend(h("span", {}, x.soal ? `${x.soal} = ${x.jawaban}` : x.jawaban))
      sisa.textContent = `Sudah ${riwayat.length} · sisa ${tumpuk.length}`
      denyut(besar); bunyi.klik()
    }
    mulai()
    const adaSoal = b.isi.some((x) => x.soal)
    el.append(h("div", { class: "panel pemanggil" }, h("div", {}, "Panggilan:"), besar, jawab,
      h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("🎲 Ambil", ambil, "ungu"), adaSoal && tombol("👁 Jawaban", () => { lihat = !lihat; jawab.textContent = lihat && riwayat.length && riwayat[riwayat.length - 1].soal ? `Jawaban: ${riwayat[riwayat.length - 1].jawaban}` : "" }, "kedua"), tombol("↺ Mulai lagi", mulai, "kedua")),
      sisa, rw, h("p", { class: "kecil" }, `Papan bingo murid (${b.jumlah_papan} papan) ada di tampilan cetak — tekan 🖨 di kanan atas.`)))
  }

  K.ular_tangga = (el, b) => {
    const sel = (no) => {
      const r = Math.floor((no - 1) / 10)
      const c = r % 2 === 0 ? (no - 1) % 10 : 9 - ((no - 1) % 10)
      return { x: c * 50 + 25, y: (9 - r) * 50 + 25 }
    }
    const lompat = {}
    for (const [a, z] of b.tangga) lompat[a] = z
    for (const [a, z] of b.ular) lompat[a] = z
    const WARNA = ["#2F6FDE", "#D64545", "#2E9E5B", "#F28C28"]
    let pos, giliran, sibuk, menang
    const papan = h("div", { class: "papan" })
    papan.append(el.parentNode.querySelector(".cetak svg.ular-tangga").cloneNode(true))
    const svg = papan.querySelector("svg")
    const bidak = Array.from({ length: b.tim }, (_, t) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      c.setAttribute("r", "11"); c.setAttribute("fill", WARNA[t]); c.setAttribute("stroke", "#fff"); c.setAttribute("stroke-width", "3")
      c.style.transition = "cx .16s, cy .16s"
      svg.append(c)
      return c
    })
    const dadu = h("div", { class: "dadu", title: "Lempar dadu" }, "🎲")
    const daftarTim = h("div")
    const pesan = h("div", { class: "info" })
    function letak(t) {
      const sama = pos.map((p, k) => (p === pos[t] ? k : -1)).filter((k) => k >= 0)
      const urutan = sama.indexOf(t), geser = (urutan - (sama.length - 1) / 2) * 12
      const p = pos[t] === 0 ? { x: -14 + 0, y: 475 } : sel(pos[t])
      bidak[t].setAttribute("cx", pos[t] === 0 ? 14 + t * 24 : p.x + geser)
      bidak[t].setAttribute("cy", pos[t] === 0 ? 488 : p.y + 6)
    }
    function tulisTim() {
      daftarTim.replaceChildren(...pos.map((p, t) => h("div", { class: `tim${t === giliran ? " giliran" : ""}` }, h("span", { class: "bidak", style: `background:${WARNA[t]}` }), `Tim ${t + 1}`, h("span", { style: "margin-left:auto" }, p ? `petak ${p}` : "start"))))
      pos.forEach((_, t) => letak(t))
      el.dataset.posisi = pos.join(",")
    }
    function mulai() { pos = Array(b.tim).fill(0); giliran = 0; sibuk = false; menang = false; pesan.textContent = "Tim 1 mulai. Ketuk dadu!"; tulisTim() }
    const tunggu = (ms) => new Promise((r) => setTimeout(r, ms))
    async function jalan(t, n) {
      let arah = 1
      for (let s = 0; s < n; s++) {
        if (pos[t] === 100) arah = -1
        pos[t] += arah
        letak(t); bunyi.klik()
        await tunggu(220)
      }
    }
    async function lempar(nilai) {
      if (sibuk || menang) return
      sibuk = true
      dadu.classList.add("putar")
      for (let i = 0; i < 8; i++) { dadu.textContent = 1 + Math.floor(Math.random() * 6); await tunggu(70) }
      const n = nilai || 1 + Math.floor(Math.random() * 6)
      dadu.textContent = n
      dadu.classList.remove("putar")
      const t = giliran
      pesan.textContent = `Tim ${t + 1} mendapat ${n}`
      await jalan(t, n)
      if (lompat[pos[t]]) {
        const naik = lompat[pos[t]] > pos[t]
        await tunggu(250)
        pesan.textContent = naik ? `Tim ${t + 1} naik tangga! 🪜` : `Tim ${t + 1} kena ular! 🐍`
        naik ? bunyi.benar() : bunyi.salah()
        pos[t] = lompat[pos[t]]
        letak(t)
        await tunggu(400)
      }
      tulisTim()
      const soal = b.soal[pos[t]]
      if (pos[t] === 100) {
        menang = true
        el.dataset.pemenang = t + 1
        konfeti(); bunyi.menang()
        modal(h("div", { class: "besar" }, `🏆 Tim ${t + 1} menang!`), [["Main lagi", mulai, "hijau"]])
      } else if (soal) {
        await new Promise((selesai) => {
          const jwb = h("div", { class: "info", style: "margin-top:10px;color:#2E9E5B" })
          modal([h("div", { class: "kecil" }, `Petak ${pos[t]} — Tim ${t + 1}`), h("div", { class: "besar", style: "font-size:1.8em" }, soal.soal), jwb], [
            ...(soal.jawaban ? [["👁 Jawaban", () => { jwb.textContent = `Jawaban: ${soal.jawaban}`; return false }, "kedua"]] : []),
            ["Lanjut ▶", selesai, "hijau"],
          ])
        })
      }
      if (!menang) { giliran = (giliran + 1) % b.tim; pesan.textContent = `Giliran Tim ${giliran + 1}`; tulisTim() }
      sibuk = false
    }
    dadu.onclick = () => lempar()
    el.__lempar = lempar
    el.append(h("div", { class: "ut" }, papan, h("div", { class: "panel" }, dadu, pesan, daftarTim, h("div", { class: "baris-tombol" }, tombol("↺ Mulai lagi", mulai, "kedua")), h("p", { class: "kecil" }, "Aturan: harus tepat di petak 100; kelebihan langkah mundur. Petak berwarna jingga berisi soal."))))
    mulai()
  }

  K.peraga = (el, b) => {
    const gbr = h("div", { class: "gbr" })
    const panel = h("div", { class: "panel" })
    const kotak = h("div", { class: "peraga-i" }, gbr, panel)
    el.append(kotak)
    let t = 0
    const tantangan = b.tantangan || []
    const tTeks = h("div", { class: "tantangan" })
    const umpan = h("div")
    function tulisTantangan(tugas) {
      if (!tantangan.length) return
      tTeks.textContent = t < tantangan.length ? `🎯 ${tugas(tantangan[t])}` : "🎉 Semua tantangan selesai!"
    }
    function nilaiTantangan(cek, tugas) {
      if (t >= tantangan.length) return
      const r = cek(tantangan[t])
      if (r) {
        bunyi.benar()
        umpan.replaceChildren(h("div", { class: "umpan ya" }, r === true ? "✔ Tepat!" : r))
        t++
        el.dataset.tantangan = t
        if (t === tantangan.length) { konfeti(); bunyi.menang() }
        tulisTantangan(tugas)
      } else {
        bunyi.salah(); kocok(gbr)
        umpan.replaceChildren(h("div", { class: "umpan tidak" }, "Belum tepat, coba lagi!"))
      }
    }
    if (b.alat === "pecahan") {
      let n = b.penyebut, arsir = new Set()
      const nilai = h("div", { class: "nilai" })
      const tugas = (x) => `Arsir ${x}`
      function gambarUlang() {
        gbr.innerHTML = gambar({ jenis: "pecahan", bentuk: b.bentuk, penyebut: n, arsir: [...arsir], label: false })
        nilai.textContent = `${arsir.size}/${n}`
        el.dataset.nilai = `${arsir.size}/${n}`
      }
      gbr.addEventListener("click", (e) => {
        const i = e.target.closest("[data-i]")?.dataset.i
        if (i == null) return
        arsir.has(+i) ? arsir.delete(+i) : arsir.add(+i)
        bunyi.klik(); gambarUlang()
      })
      tambah(panel, h("div", {}, "Bagian yang diarsir:"), nilai,
        b.ubah_penyebut && h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("− bagian", () => { if (n > 1) { n--; arsir.clear(); gambarUlang() } }, "kedua"), tombol("+ bagian", () => { if (n < 12) { n++; arsir.clear(); gambarUlang() } }, "kedua")),
        h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("↺ Kosongkan", () => { arsir.clear(); gambarUlang() }, "kedua")),
        tantangan.length && [tTeks, h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("Periksa ✔", () => nilaiTantangan((x) => {
          const [a, c] = x.split("/").map(Number)
          if (arsir.size * c !== a * n) return false
          return n === c ? true : `✔ Benar! ${arsir.size}/${n} senilai dengan ${x}.`
        }, tugas), "hijau")), umpan])
      el.__atur = (bagian) => { arsir = new Set(bagian); gambarUlang() }
      gambarUlang(); tulisTantangan(tugas)
    } else if (b.alat === "jam") {
      let menitTotal = b.jam * 60 + b.menit
      const digital = h("div", { class: "nilai" })
      const tugas = (x) => `Atur jam ke pukul ${x}`
      const dua = (v) => String(v).padStart(2, "0")
      function gambarUlang() {
        menitTotal = ((menitTotal % 1440) + 1440) % 1440
        const j = Math.floor(menitTotal / 60), m = menitTotal % 60
        gbr.innerHTML = svgJam({ jam: j, menit: m, label: false })
        digital.textContent = `${dua(j)}.${dua(m)}`
        el.dataset.nilai = `${dua(j)}.${dua(m)}`
      }
      let seret = false
      const geser = (e) => {
        const svg = gbr.querySelector("svg")
        const p = svgTitik(svg, e)
        let sudut = (Math.atan2(p.x - 50, 50 - p.y) * 180) / Math.PI
        if (sudut < 0) sudut += 360
        let m = Math.round(sudut / 6 / b.langkah) * b.langkah % 60
        const lama = menitTotal % 60
        let j = Math.floor(menitTotal / 60)
        if (lama >= 45 && m < 15) j++
        else if (lama < 15 && m >= 45) j--
        if (m !== lama || j !== Math.floor(menitTotal / 60)) { menitTotal = j * 60 + m; gambarUlang() }
      }
      gbr.addEventListener("pointerdown", (e) => { seret = true; gbr.setPointerCapture?.(e.pointerId); geser(e) })
      gbr.addEventListener("pointermove", (e) => seret && geser(e))
      gbr.addEventListener("pointerup", () => (seret = false))
      tambah(panel, digital, h("p", { class: "kecil", style: "text-align:center" }, "Geser jarum panjang (menit) di jam, atau pakai tombol."),
        h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("− 1 jam", () => { menitTotal -= 60; gambarUlang() }, "kedua"), tombol("+ 1 jam", () => { menitTotal += 60; gambarUlang() }, "kedua")),
        h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol(`− ${b.langkah} menit`, () => { menitTotal -= b.langkah; gambarUlang() }, "kedua"), tombol(`+ ${b.langkah} menit`, () => { menitTotal += b.langkah; gambarUlang() }, "kedua")),
        tantangan.length && [tTeks, h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("Periksa ✔", () => nilaiTantangan((x) => {
          const [j, m] = x.split(".").map(Number)
          return (menitTotal % 720) === ((j % 12) * 60 + m)
        }, tugas), "hijau")), umpan])
      el.__atur = (j, m) => { menitTotal = j * 60 + m; gambarUlang() }
      gambarUlang(); tulisTantangan(tugas)
    } else if (b.alat === "garis_bilangan") {
      kotak.classList.add("lebar")
      let titik = new Set(b.tandai.map(Number)), k = 0
      const info = h("div", { class: "nilai", style: "font-size:2.2em" })
      function gambarUlang() {
        gbr.innerHTML = gambar({ ...b, jenis: "garis_bilangan", tandai: [...titik], loncatan: b.loncatan.slice(0, k) })
        const l = b.loncatan[k - 1]
        info.textContent = l ? `${l[0]} → ${l[1]}  (${l[1] - l[0] >= 0 ? "+" : ""}${l[1] - l[0]})` : titik.size ? `Titik: ${[...titik].sort((a, z) => a - z).join(", ")}` : ""
        el.dataset.loncat = k
      }
      gbr.addEventListener("click", (e) => {
        const p = svgTitik(gbr.querySelector("svg"), e)
        const nilai = b.mulai + ((p.x - 20) / 560) * (b.akhir - b.mulai)
        const v = b.mulai + Math.round((nilai - b.mulai) / b.lompat) * b.lompat
        if (v < b.mulai || v > b.akhir || Math.abs(p.y - 60) > 30) return
        titik.has(v) ? titik.delete(v) : titik.add(v)
        bunyi.klik(); gambarUlang()
      })
      tambah(panel, info, h("div", { class: "baris-tombol", style: "justify-content:center" },
        b.loncatan.length && tombol("Loncat ▶", () => { if (k < b.loncatan.length) { k++; bunyi.klik(); gambarUlang() } }, "ungu"),
        tombol("↺ Ulang", () => { k = 0; titik = new Set(b.tandai.map(Number)); gambarUlang() }, "kedua")),
        h("p", { class: "kecil", style: "text-align:center" }, "Ketuk garis untuk memberi/menghapus titik."))
      gambarUlang()
    } else if (b.alat === "dienes") {
      kotak.classList.add("lebar")
      let r = Math.floor(b.bilangan / 100), p = Math.floor((b.bilangan % 100) / 10), s = b.bilangan % 10
      const nilai = h("div", { class: "nilai" })
      const tabel = h("div", { class: "hitung" })
      const tugas = (x) => `Tunjukkan bilangan ${x}`
      const tbTukar = h("div", { class: "baris-tombol", style: "justify-content:center" })
      function gambarUlang() {
        gbr.innerHTML = svgDienes({ ratusan: r, puluhan: p, satuan: s })
        const n = r * 100 + p * 10 + s
        nilai.textContent = n
        el.dataset.nilai = n
        tabel.replaceChildren(...[["Ratusan", r], ["Puluhan", p], ["Satuan", s]].map(([a, v]) => h("div", {}, a, h("b", {}, v))))
        tbTukar.replaceChildren(
          s >= 10 && tombol("10 satuan → 1 puluhan", () => { s -= 10; p++; bunyi.benar(); gambarUlang() }, "hijau"),
          p >= 10 && r < 9 && tombol("10 puluhan → 1 ratusan", () => { p -= 10; r++; bunyi.benar(); gambarUlang() }, "hijau"),
          p > 0 && s <= 9 && tombol("1 puluhan → 10 satuan", () => { p--; s += 10; bunyi.klik(); gambarUlang() }, "kedua"),
          r > 0 && p <= 9 && tombol("1 ratusan → 10 puluhan", () => { r--; p += 10; bunyi.klik(); gambarUlang() }, "kedua"))
      }
      const atur = (nama, d) => () => {
        if (nama === "r") r = Math.max(0, Math.min(9, r + d))
        if (nama === "p") p = Math.max(0, Math.min(19, p + d))
        if (nama === "s") s = Math.max(0, Math.min(19, s + d))
        bunyi.klik(); gambarUlang()
      }
      tambah(panel, h("div", { style: "display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center" }, nilai, tabel),
        h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("+ ratusan", atur("r", 1), "oranye"), tombol("− ratusan", atur("r", -1), "kedua"), tombol("+ puluhan", atur("p", 1)), tombol("− puluhan", atur("p", -1), "kedua"), tombol("+ satuan", atur("s", 1), "hijau"), tombol("− satuan", atur("s", -1), "kedua"), tombol("↺", () => { r = p = s = 0; gambarUlang() }, "kedua")),
        tbTukar,
        tantangan.length && [tTeks, h("div", { class: "baris-tombol", style: "justify-content:center" }, tombol("Periksa ✔", () => nilaiTantangan((x) => {
          if (r * 100 + p * 10 + s !== x) return false
          return p > 9 || s > 9 ? `✔ Benar, nilainya ${x}! Coba tukar 10 blok supaya lebih rapi.` : true
        }, tugas), "hijau")), umpan])
      el.__atur = (a, c, d) => { r = a; p = c; s = d; gambarUlang() }
      gambarUlang(); tulisTantangan(tugas)
    } else if (b.alat === "tabel_perkalian") {
      kotak.classList.add("lebar")
      const nil = Array.from({ length: b.sampai - b.dari + 1 }, (_, i) => b.dari + i)
      const tbl = h("table", { class: "perkalian i" })
      const kepala = h("tr", {}, h("th", {}, "×"), nil.map((v) => h("th", { "data-k": v }, v)))
      tbl.append(kepala, ...nil.map((r) => h("tr", {}, h("th", { "data-r": r }, r), nil.map((c) => h("td", { "data-r": r, "data-k": c, onclick: (e) => {
        const td = e.currentTarget
        td.classList.toggle("buka")
        td.textContent = td.classList.contains("buka") ? r * c : ""
        tbl.querySelectorAll(".sorot").forEach((x) => x.classList.remove("sorot"))
        if (td.classList.contains("buka")) tbl.querySelectorAll(`th[data-r="${r}"],th[data-k="${c}"]`).forEach((x) => x.classList.add("sorot"))
        bunyi.klik()
      } })))))
      gbr.append(tbl)
      tambah(panel, h("div", { class: "baris-tombol", style: "justify-content:center" },
        tombol("Buka semua", () => tbl.querySelectorAll("td").forEach((td) => { td.classList.add("buka"); td.textContent = td.dataset.r * td.dataset.k }), "hijau"),
        tombol("Tutup semua", () => tbl.querySelectorAll("td").forEach((td) => { td.classList.remove("buka"); td.textContent = "" }), "kedua")),
        h("p", { class: "kecil", style: "text-align:center" }, "Ketuk kotak untuk membuka hasil perkalian."))
    }
  }

  // ---------- Mulai ----------
  function pasang() {
    body.classList.add("interaktif")
    layar.forEach((sec) => {
      if (!sec.dataset.interaktif) return
      const b = SPEK.bagian[Number(sec.dataset.i)]
      const main = sec.querySelector(".main")
      const f = K[b.jenis] || (window.MediaTiga && window.MediaTiga[b.jenis])
      try {
        if (!f) throw new Error("tidak didukung")
        f(main, b, sec)
      } catch (e) {
        // Peramban tidak mendukung (misalnya tanpa WebGL): tampilkan versi statis.
        sec.removeAttribute("data-interaktif")
        main.replaceChildren(h("p", { class: "kecil" }, "Bagian ini ditampilkan versi gambarnya di perangkat ini."))
        if (window.console) console.warn("media:", b.jenis, e)
      }
    })
    const awal = Number((location.hash.match(/layar-(\d+)/) || [])[1] || 1) - 1
    tampil(awal)
  }
  window.MediaAsisten = { h, tombol, bunyi, konfeti, modal, tampil, acakArr }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang)
  else setTimeout(pasang, 0)
})()
