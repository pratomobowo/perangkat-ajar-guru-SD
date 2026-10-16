// Peraga 3D (three.js r162, disisipkan sebelum berkas ini): bangun ruang yang bisa diputar dengan jari, dibuka menjadi
// jaring-jaring, dan ditandai sisi/rusuk/titik sudutnya; serta volume dengan kubus satuan yang disusun lapis demi lapis.
// Semua perhitungan bentuk ada di ruang.js (sama dengan yang diuji di server). Jika WebGL tidak tersedia, fungsi di sini
// melempar galat dan runtime.js menampilkan versi gambar (statis).
;(function () {
  "use strict"
  const T = window.THREE
  const M = window.MediaAsisten
  if (!T || !M) return
  const { h, tombol, bunyi, konfeti } = M

  // Bidang jaring (x, y, z ke atas) → koordinat three.js (y ke atas).
  const ke3 = (p) => new T.Vector3(p[0], p[2], -p[1])

  function bisaWebGL() {
    try {
      const c = document.createElement("canvas")
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")))
    } catch (e) {
      return false
    }
  }

  /** Panggung 3D: renderer, kamera, cahaya, putar dengan jari/tetikus, cubit/roda untuk zoom, render hanya saat tampil. */
  function panggung(wadah, sec) {
    if (!bisaWebGL()) throw new Error("WebGL tidak tersedia")
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    wadah.prepend(renderer.domElement)
    const scene = new T.Scene()
    const kamera = new T.PerspectiveCamera(40, 1, 0.1, 500)
    scene.add(new T.HemisphereLight(0xffffff, 0x8899aa, 1.6))
    const matahari = new T.DirectionalLight(0xffffff, 1.6)
    matahari.position.set(5, 10, 7)
    scene.add(matahari)
    const poros = new T.Group()
    scene.add(poros)
    const st = { yaw: -0.6, pitch: 0.45, jarak: 12, target: new T.Vector3(0, 1, 0), putarOtomatis: true, tiap: null }
    const titikJari = new Map()
    let jarakCubit = 0
    const el = renderer.domElement
    el.addEventListener("pointerdown", (e) => { titikJari.set(e.pointerId, [e.clientX, e.clientY]); el.setPointerCapture?.(e.pointerId); st.putarOtomatis = false; st.onSentuh?.() })
    el.addEventListener("pointermove", (e) => {
      if (!titikJari.has(e.pointerId)) return
      const [x0, y0] = titikJari.get(e.pointerId)
      titikJari.set(e.pointerId, [e.clientX, e.clientY])
      if (titikJari.size === 2) {
        const [a, b] = [...titikJari.values()]
        const d = Math.hypot(a[0] - b[0], a[1] - b[1])
        if (jarakCubit) st.jarak = Math.max(3, Math.min(80, st.jarak * (jarakCubit / d)))
        jarakCubit = d
        return
      }
      st.yaw -= (e.clientX - x0) * 0.008
      st.pitch = Math.max(-1.2, Math.min(1.45, st.pitch + (e.clientY - y0) * 0.008))
    })
    const lepas = (e) => { titikJari.delete(e.pointerId); if (titikJari.size < 2) jarakCubit = 0 }
    el.addEventListener("pointerup", lepas)
    el.addEventListener("pointercancel", lepas)
    el.addEventListener("wheel", (e) => { e.preventDefault(); st.jarak = Math.max(3, Math.min(80, st.jarak * (e.deltaY > 0 ? 1.1 : 0.9))) }, { passive: false })
    function ukur() {
      const w = wadah.clientWidth, t = wadah.clientHeight
      if (!w || !t) return
      renderer.setSize(w, t, false)
      kamera.aspect = w / t
      kamera.updateProjectionMatrix()
    }
    let jalan = false
    function bingkai() {
      const tampak = sec.classList.contains("aktif") || document.body.classList.contains("semua")
      if (!tampak) { jalan = false; return }
      ukur()
      if (st.putarOtomatis) st.yaw += 0.004
      st.tiap?.()
      kamera.position.set(st.target.x + st.jarak * Math.cos(st.pitch) * Math.sin(st.yaw), st.target.y + st.jarak * Math.sin(st.pitch), st.target.z + st.jarak * Math.cos(st.pitch) * Math.cos(st.yaw))
      kamera.lookAt(st.target)
      renderer.render(scene, kamera)
      requestAnimationFrame(bingkai)
    }
    const mulai = () => { if (!jalan) { jalan = true; requestAnimationFrame(bingkai) } }
    sec.addEventListener("tampil", mulai)
    mulai()
    return { scene, poros, st, renderer }
  }

  function labelSprite(teks, warna = "#1E2533") {
    const c = document.createElement("canvas")
    c.width = c.height = 128
    const g = c.getContext("2d")
    g.fillStyle = "rgba(255,255,255,0.92)"
    g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fill()
    g.lineWidth = 6; g.strokeStyle = warna; g.stroke()
    g.fillStyle = warna
    g.font = "bold 64px Arial"
    g.textAlign = "center"; g.textBaseline = "middle"
    g.fillText(teks, 64, 68)
    const tex = new T.CanvasTexture(c)
    return new T.Sprite(new T.SpriteMaterial({ map: tex }))
  }

  /** Batang tipis antara dua titik (garis tebal untuk rusuk yang ditandai). */
  function batang(a, b, r, bahan) {
    const arah = new T.Vector3().subVectors(b, a)
    const m = new T.Mesh(new T.CylinderGeometry(r, r, arah.length(), 10), bahan)
    m.position.copy(a).add(b).multiplyScalar(0.5)
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), arah.normalize())
    return m
  }

  const NAMA = (s) => s[0].toUpperCase() + s.slice(1)

  // ---------------- Bangun ruang ----------------
  function ruang(el, b, sec) {
    const kanvas = h("div", { class: "kanvas" }, h("div", { class: "petunjuk-geser" }, "Geser untuk memutar · cubit/roda untuk memperbesar"))
    const panel = h("div", { class: "panel" })
    const pilih = h("div", { class: "pilih-bangun" })
    el.append(h("div", { class: "tiga" }, h("div", {}, b.bangun.length > 1 ? pilih : null, kanvas), panel))
    const P = panggung(kanvas, sec)
    let model = null

    function bangunModel(x) {
      if (model) { P.poros.remove(model.grup); model.grup.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.map) o.material.map.dispose() }) }
      const data = BANGUN_RUANG[x.bentuk]
      const grup = new T.Group()
      P.poros.add(grup)
      const st = { buka: 0, warna: true, rusuk: false, titik: false }
      const bahanSisi = []
      const warnaPolos = new T.Color("#9CC3F0")
      const bahanRusuk = new T.MeshStandardMaterial({ color: "#D64545" })
      const bahanTitik = new T.MeshStandardMaterial({ color: "#FFC83D" })
      const tandaGrup = new T.Group()
      grup.add(tandaGrup)
      let perbarui
      const datar = jaringDatar(x)
      const bahan = (w) => {
        const m = new T.MeshStandardMaterial({ color: w, side: T.DoubleSide, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
        m.userData.asli = new T.Color(w)
        bahanSisi.push(m)
        return m
      }
      const garisBahan = new T.LineBasicMaterial({ color: "#1E2533" })
      let ukuran = 1
      if (datar) {
        const sisiMesh = datar.map((s) => {
          const g = new T.BufferGeometry()
          g.setAttribute("position", new T.Float32BufferAttribute(new Float32Array((s.titik.length - 2) * 9), 3))
          const m = new T.Mesh(g, bahan(s.warna))
          grup.add(m)
          return m
        })
        const nGaris = datar.reduce((a, s) => a + s.titik.length, 0)
        const gGaris = new T.BufferGeometry()
        gGaris.setAttribute("position", new T.Float32BufferAttribute(new Float32Array(nGaris * 6), 3))
        grup.add(new T.LineSegments(gGaris, garisBahan))
        perbarui = () => {
          const s3 = lipatJaring(datar, st.buka)
          let gi = 0
          const gp = gGaris.attributes.position.array
          s3.forEach((s, i) => {
            const v = s.titik.map(ke3)
            const arr = sisiMesh[i].geometry.attributes.position.array
            for (let k = 1; k < v.length - 1; k++) [v[0], v[k], v[k + 1]].forEach((q, j) => q.toArray(arr, ((k - 1) * 3 + j) * 3))
            sisiMesh[i].geometry.attributes.position.needsUpdate = true
            sisiMesh[i].geometry.computeVertexNormals()
            sisiMesh[i].geometry.computeBoundingSphere()
            v.forEach((q, k) => { q.toArray(gp, gi); v[(k + 1) % v.length].toArray(gp, gi + 3); gi += 6 })
          })
          gGaris.attributes.position.needsUpdate = true
          gGaris.computeBoundingSphere()
          return s3
        }
        ukuran = Math.max(...kerangka(lipatJaring(datar, 0)).titik.flatMap((p) => [Math.abs(p[0]), Math.abs(p[1]), p[2]]))
      } else if (x.bentuk === "tabung" || x.bentuk === "kerucut") {
        const N = 48
        const lengkung = new T.Mesh(new T.BufferGeometry(), bahan("#5B9BD5"))
        const alas = [new T.Mesh(new T.BufferGeometry(), bahan("#ED7D31")), new T.Mesh(new T.BufferGeometry(), bahan("#ED7D31"))]
        grup.add(lengkung, alas[0])
        if (x.bentuk === "tabung") grup.add(alas[1])
        const kisi = (baris) => {
          const pos = [], idx = []
          const n = baris[0].length
          baris.forEach((r) => r.forEach((p) => pos.push(...ke3(p).toArray())))
          for (let i = 0; i < baris.length - 1; i++) for (let k = 0; k < n - 1; k++) { const a = i * n + k; idx.push(a, a + 1, a + n, a + 1, a + n + 1, a + n) }
          const g = new T.BufferGeometry()
          g.setAttribute("position", new T.Float32BufferAttribute(pos, 3))
          g.setIndex(idx)
          g.computeVertexNormals()
          return g
        }
        const kipas = (pusat, tepi) => {
          const pos = []
          tepi.forEach((p, k) => pos.push(...ke3(pusat).toArray(), ...ke3(p).toArray(), ...ke3(tepi[(k + 1) % tepi.length]).toArray()))
          const g = new T.BufferGeometry()
          g.setAttribute("position", new T.Float32BufferAttribute(pos, 3))
          g.computeVertexNormals()
          return g
        }
        perbarui = () => {
          const ganti = (m, g) => { m.geometry.dispose(); m.geometry = g }
          if (x.bentuk === "tabung") {
            ganti(lengkung, kisi(selimutTabung(x.r, x.t, st.buka, N)))
            tutupTabung(x.r, x.t, st.buka).forEach((tp, k) => ganti(alas[k], kipas(lingkaranTutup(tp, 0, 1)[0], lingkaranTutup(tp, x.r, N))))
          } else {
            ganti(lengkung, kisi(selimutKerucut(x.r, x.t, st.buka, N, 8)))
            ganti(alas[0], kipas([0, 0, 0], Array.from({ length: N }, (_, k) => [x.r * Math.cos((k / N) * 2 * Math.PI), x.r * Math.sin((k / N) * 2 * Math.PI), 0])))
          }
          return null
        }
        ukuran = x.bentuk === "tabung" ? Math.max(2 * x.r, x.t, Math.PI * x.r) : Math.max(x.r, x.t)
      } else {
        const bola = new T.Mesh(new T.SphereGeometry(x.r, 48, 32), bahan("#5B9BD5"))
        bola.position.set(0, x.r, 0)
        grup.add(bola)
        perbarui = () => null
        ukuran = 2 * x.r
      }
      // Skala tampilan: bangun utuh ± 4 satuan.
      const skala = 4 / ukuran
      grup.scale.setScalar(skala)

      function tanda() {
        tandaGrup.clear()
        if (st.buka > 0.001) return
        const tebal = 0.045 / skala
        if (datar) {
          const k = kerangka(lipatJaring(datar, 0))
          if (st.rusuk) k.rusuk.forEach(([a, z]) => tandaGrup.add(batang(ke3(k.titik[a]), ke3(k.titik[z]), tebal, bahanRusuk)))
          // Label diletakkan di luar bangun (menjauhi titik tengahnya) supaya tertutup sisi bila titiknya di belakang.
          const pusat = k.titik.reduce((a, p) => a.add(ke3(p)), new T.Vector3()).divideScalar(k.titik.length)
          if (st.titik)
            k.titik.forEach((p, i) => {
              const bola = new T.Mesh(new T.SphereGeometry(tebal * 2.6, 16, 12), bahanTitik)
              bola.position.copy(ke3(p))
              const lb = labelSprite("ABCDEFGHIJKL"[i])
              lb.position.copy(ke3(p)).add(ke3(p).sub(pusat).normalize().multiplyScalar(0.45 / skala))
              lb.scale.setScalar(0.5 / skala)
              tandaGrup.add(bola, lb)
            })
        } else if (x.bentuk === "tabung" || x.bentuk === "kerucut") {
          const lingkar = (pusat, sumbu) => {
            const titik = Array.from({ length: 64 }, (_, k) => {
              const a = (k / 64) * Math.PI * 2
              return sumbu === "y" ? ke3([pusat[0] + x.r * Math.cos(a), pusat[1], pusat[2] + x.r * Math.sin(a)]) : ke3([x.r * Math.cos(a), x.r * Math.sin(a), 0])
            })
            if (st.rusuk) titik.forEach((p, k) => tandaGrup.add(batang(p, titik[(k + 1) % titik.length], tebal, bahanRusuk)))
          }
          if (x.bentuk === "tabung") { lingkar([Math.PI * x.r, 0, x.r], "y"); lingkar([Math.PI * x.r, x.t, x.r], "y") }
          else {
            lingkar(null, "z")
            if (st.titik) {
              const pc = ke3([0, 0, x.t])
              const bola = new T.Mesh(new T.SphereGeometry(tebal * 2.6, 16, 12), bahanTitik)
              bola.position.copy(pc)
              const lb = labelSprite("T")
              lb.position.copy(pc).add(new T.Vector3(0, 0.45 / skala, 0))
              lb.scale.setScalar(0.5 / skala)
              tandaGrup.add(bola, lb)
            }
          }
        }
      }

      function atur() {
        perbarui()
        bahanSisi.forEach((m) => m.color.copy(st.warna ? m.userData.asli : warnaPolos))
        // Pusatkan: tengah kotak pembatas di sumbu x/z, alas di y = 0.
        grup.position.set(0, 0, 0)
        grup.updateMatrixWorld(true)
        const kotak = new T.Box3().setFromObject(grup)
        const c = kotak.getCenter(new T.Vector3())
        grup.position.set(-c.x, -kotak.min.y, -c.z)
        P.st.target.set(0, Math.min(2, (kotak.max.y - kotak.min.y) / 2), 0)
        const lebar = Math.max(kotak.max.x - kotak.min.x, kotak.max.z - kotak.min.z, kotak.max.y - kotak.min.y)
        P.st.jarakIdeal = Math.max(13, lebar * 2.3)
        tanda()
        el.dataset.buka = st.buka.toFixed(2)
      }
      return { grup, st, atur, data }
    }

    let animasi = null
    function tampilkan(x) {
      model = bangunModel(x)
      const d = model.data
      const lengkung = !jaringDatar(x)
      panel.replaceChildren()
      const slider = h("input", { type: "range", min: 0, max: 100, value: 0, disabled: x.bentuk === "bola" ? true : null })
      slider.oninput = () => { animasi = null; model.st.buka = slider.value / 100; model.atur() }
      const tbBuka = tombol("▶ Buka jaring-jaring", () => {
        const tujuan = model.st.buka < 0.5 ? 1 : 0
        const awal = model.st.buka, t0 = performance.now()
        animasi = () => {
          const k = Math.min(1, (performance.now() - t0) / 2200)
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
          model.st.buka = awal + (tujuan - awal) * e
          slider.value = Math.round(model.st.buka * 100)
          model.atur()
          if (k >= 1) { animasi = null; tbBuka.textContent = tujuan ? "◀ Lipat jadi bangun" : "▶ Buka jaring-jaring"; bunyi.klik() }
        }
      }, "ungu")
      if (x.bentuk === "bola") tbBuka.disabled = true
      const sakelar = (label, kunci) => {
        const t = tombol(label, () => { model.st[kunci] = !model.st[kunci]; t.classList.toggle("nyala", model.st[kunci]); t.classList.toggle("kedua", !model.st[kunci]); if (model.st.buka > 0 && kunci !== "warna") { model.st.buka = 0; slider.value = 0 } model.atur(); bunyi.klik() }, model.st[kunci] ? "nyala" : "kedua")
        return t
      }
      const kotakHitung = (nama, nilai) => {
        const b = h("b", {}, "?")
        const d = h("div", { style: "cursor:pointer", title: "Ketuk untuk melihat", onclick: () => { b.textContent = nilai; denyutkan(d); bunyi.benar() } }, nama, b)
        return d
      }
      const denyutkan = (e) => { e.classList.remove("denyut"); void e.offsetWidth; e.classList.add("denyut") }
      panel.append(
        h("div", { class: "besar", style: "font-size:1.8em" }, NAMA(x.bentuk)),
        h("p", { class: "kecil" }, Object.entries(x).filter(([k]) => k !== "bentuk").map(([k, v]) => `${k} = ${v}`).join(" · ")),
        h("div", { class: "hitung" }, kotakHitung("Sisi", d.sisi), kotakHitung("Rusuk", d.rusuk), d.puncak ? kotakHitung("Titik puncak", d.puncak) : kotakHitung("Titik sudut", d.titik)),
        h("p", { class: "kecil" }, "Ketuk “?” untuk melihat jawabannya."),
        h("div", { class: "baris-tombol" }, sakelar("🎨 Sisi berwarna", "warna"), d.rusuk ? sakelar("📏 Rusuk", "rusuk") : null, d.titik || d.puncak ? sakelar(d.puncak ? "📍 Titik puncak" : "📍 Titik sudut", "titik") : null),
        h("div", {}, x.bentuk === "bola" ? h("p", {}, "Bola tidak memiliki jaring-jaring.") : [h("div", { class: "kecil" }, lengkung ? "Buka selimut dan alasnya:" : "Geser untuk membuka:"), slider, h("div", { class: "baris-tombol" }, tbBuka)]),
        h("div", { class: "baris-tombol" }, tombol("🔄 Putar otomatis", () => { P.st.putarOtomatis = !P.st.putarOtomatis }, "kedua")),
      )
      model.atur()
      P.st.jarak = P.st.jarakIdeal
      el.dataset.bentuk = x.bentuk
    }
    P.st.tiap = () => { animasi?.(); if (P.st.jarakIdeal && model?.st.buka > 0 && P.st.jarak < P.st.jarakIdeal) P.st.jarak += (P.st.jarakIdeal - P.st.jarak) * 0.05 }
    b.bangun.forEach((x, i) => pilih.append(tombol(NAMA(x.bentuk), () => { pilih.querySelectorAll(".tombol").forEach((t, k) => t.classList.toggle("kedua", k !== i)); tampilkan(x) }, i ? "kedua" : "")))
    tampilkan(b.bangun[0])
    el.__model = () => model
  }

  // ---------------- Volume kubus satuan ----------------
  function volume(el, b, sec) {
    const kanvas = h("div", { class: "kanvas" }, h("div", { class: "petunjuk-geser" }, "Geser untuk memutar"))
    const panel = h("div", { class: "panel" })
    el.append(h("div", { class: "tiga" }, kanvas, panel))
    const P = panggung(kanvas, sec)
    const { p, l, t } = b
    const geo = new T.BoxGeometry(0.94, 0.94, 0.94)
    const tepi = new T.EdgesGeometry(geo)
    const warnaLapis = ["#5B9BD5", "#70AD47", "#ED7D31", "#9E7CC1", "#FFC000", "#4BC4D1", "#E15759", "#A5A5A5"]
    const bahan = warnaLapis.map((w) => new T.MeshStandardMaterial({ color: w, roughness: 0.55 }))
    const garis = new T.LineBasicMaterial({ color: "#1E2533" })
    const grup = new T.Group()
    P.poros.add(grup)
    const kubus = []
    for (let z = 0; z < t; z++)
      for (let y = 0; y < l; y++)
        for (let x = 0; x < p; x++) {
          const m = new T.Mesh(geo, bahan[z % bahan.length])
          m.add(new T.LineSegments(tepi, garis))
          m.position.set(x - (p - 1) / 2, z + 0.5, y - (l - 1) / 2)
          grup.add(m)
          kubus.push(m)
        }
    P.st.target.set(0, t / 2, 0)
    P.st.jarak = Math.max(12, Math.hypot(p, l, t) * 2.4)
    const besar = h("div", { class: "besar", style: "font-size:2.6em;color:var(--biru)" })
    const rumus = h("div", { class: "info" })
    const lapisInfo = h("div", { class: "kecil" })
    let tampak = b.tebak ? kubus.length : 0, animasi = null
    function tulis() {
      kubus.forEach((m, i) => (m.visible = i < tampak))
      const lapis = Math.floor(tampak / (p * l)), sisa = tampak % (p * l)
      el.dataset.tampak = tampak
      if (b.tebak && tampak === kubus.length && !animasi && !el.dataset.dihitung) {
        besar.textContent = "? kubus"
        rumus.textContent = "Berapa kubus satuan? Tebak dulu, lalu hitung bersama!"
        lapisInfo.textContent = ""
        return
      }
      besar.textContent = `${tampak} kubus`
      lapisInfo.textContent = Array.from({ length: lapis }, (_, k) => `Lapisan ${k + 1}: ${p} × ${l} = ${p * l}`).join(" · ") + (sisa ? ` · lapisan ${lapis + 1}: ${sisa} …` : "")
      rumus.textContent = tampak === kubus.length ? `Volume = p × l × t = ${p} × ${l} × ${t} = ${p * l * t} kubus satuan` : ""
      if (tampak === kubus.length && !animasi) { el.dataset.selesai = "1" }
    }
    // Penyusunan memakai pewaktu (bukan bingkai render) supaya tetap jalan walau peramban jarang menggambar ulang.
    function susun(sampai, perLangkah) {
      clearInterval(animasi)
      animasi = setInterval(() => {
        tampak = Math.min(sampai, tampak + 1)
        bunyi.klik()
        if (tampak >= sampai) { clearInterval(animasi); animasi = null; if (sampai === kubus.length) { bunyi.menang(); konfeti() } }
        tulis()
      }, perLangkah)
    }
    panel.append(h("div", { class: "besar", style: "font-size:1.6em" }, `Balok ${p} × ${l} × ${t}`), besar, lapisInfo, rumus,
      h("div", { class: "baris-tombol" },
        tombol("▶ Hitung bersama", () => { el.dataset.dihitung = "1"; tampak = 0; tulis(); susun(kubus.length, Math.max(40, Math.min(250, 3000 / kubus.length))) }, "ungu"),
        tombol("+ 1 lapis", () => { if (tampak >= kubus.length || !el.dataset.dihitung) tampak = 0; el.dataset.dihitung = "1"; susun(Math.min(kubus.length, (Math.floor(tampak / (p * l)) + 1) * p * l), 90) }, "kedua"),
        tombol("↺", () => { clearInterval(animasi); animasi = null; delete el.dataset.dihitung; tampak = b.tebak ? kubus.length : 0; tulis() }, "kedua")))
    tulis()
  }

  window.MediaTiga = { ruang, volume }
})()
