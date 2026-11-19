// Shared utilities for the portfolio website
const sb = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Only allow http(s) so no javascript: links get through
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? esc(u) : "");
const $ = (sel, root = document) => root.querySelector(sel);
const byOrder = (q) => q.order("sort_order", { ascending: true }).order("id", { ascending: true });
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Light / dark theme toggle (remembers choice, defaults to system) ----------
(function initTheme() {
  const root = document.documentElement;
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const current = () => root.dataset.theme || (mq.matches ? "dark" : "light");
  const SUN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const bar = document.querySelector(".nav-in");
  if (!bar) return;
  const btn = document.createElement("button");
  btn.className = "tbtn";
  btn.type = "button";
  const paint = () => {
    const dark = current() === "dark";
    btn.innerHTML = dark ? SUN : MOON; // shows the mode you will switch to
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  };
  btn.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    paint();
  });
  mq.addEventListener("change", paint);
  bar.appendChild(btn);
  paint();
})();

// ---------- Lightbox ----------
let lightbox;
function openLightbox(src, alt = "") {
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML = '<img alt="">';
    lightbox.addEventListener("click", () => lightbox.classList.remove("open"));
    document.addEventListener("keydown", (e) => e.key === "Escape" && lightbox.classList.remove("open"));
    document.body.appendChild(lightbox);
  }
  const img = lightbox.querySelector("img");
  img.src = src;
  img.alt = alt;
  lightbox.classList.add("open");
}

// ---------- Photo gallery (scrolls continuously, loops, click to enlarge) ----------
function buildSlider(items) {
  const list = items.filter((i) => safeUrl(i.url));
  if (!list.length) return null;
  const many = list.length > 1;

  const root = document.createElement("div");
  root.innerHTML = `
    ${many ? `<div class="cnav gnav"><button class="cbtn" aria-label="Previous">&#8249;</button><button class="cbtn" aria-label="Next">&#8250;</button></div>` : ""}
    <div class="gstrip" role="region" aria-label="Photo gallery">
      ${list.map((i) => `
        <figure class="gitem">
          <img src="${safeUrl(i.url)}" alt="${esc(i.caption || "")}" draggable="false" loading="lazy">
          ${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ""}
        </figure>`).join("")}
    </div>`;

  const strip = $(".gstrip", root);
  strip.addEventListener("click", (e) => {
    if (e.target.matches(".gitem img")) openLightbox(e.target.src, e.target.alt);
  });
  if (!many) return root;

  const GAP = 12, SPEED = 40; // px per second
  const step = () => (strip.firstElementChild.getBoundingClientRect().width || 280) + GAP;
  const [prev, next] = root.querySelectorAll(".cbtn");
  let touched = 0, hover = false, visible = true, setW = 0, ready = false, pos = 0, last = performance.now();
  const move = (d) => { touched = performance.now(); strip.scrollBy({ left: d * step(), behavior: reduceMotion ? "auto" : "smooth" }); };
  prev.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  if (reduceMotion) return root;

  // Duplicate photos as needed so the loop stays seamless even with few photos
  function setup() {
    if (!strip.clientWidth) return false;
    const first = strip.children[0], originals = [...strip.children];
    const one = originals.length * (first.getBoundingClientRect().width + GAP);
    const sets = Math.ceil(strip.clientWidth / one) + 1;
    for (let s = 0; s < sets; s++) originals.forEach((c) => {
      const k = c.cloneNode(true);
      k.setAttribute("aria-hidden", "true");
      strip.appendChild(k);
    });
    setW = one;
    return true;
  }

  strip.addEventListener("mouseenter", () => (hover = true));
  strip.addEventListener("mouseleave", () => (hover = false));
  ["pointerdown", "touchstart", "wheel"].forEach((ev) =>
    strip.addEventListener(ev, () => (touched = performance.now()), { passive: true }));
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.1 }).observe(strip);

  const tick = (now) => {
    const dt = Math.min(now - last, 100) / 1000;
    last = now;
    if (!ready) ready = setup();
    else if (hover || !visible || document.hidden || now - touched < 2500) {
      pos = strip.scrollLeft;
    } else {
      pos += SPEED * dt;
      if (pos >= setW) pos -= setW;
      strip.scrollLeft = pos;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return root;
}

// ---------- Certificate files: show the CONTENT of PDF / DOCX / images ----------
const fileExt = (u) => (String(u || "").split("?")[0].split("#")[0].split(".").pop() || "").toLowerCase();
const fileKind = (u) => {
  const e = fileExt(u);
  if (e === "pdf") return "pdf";
  if (e === "docx") return "docx";
  if (/^(png|jpe?g|gif|webp|avif|svg)$/.test(e)) return "image";
  return "other";
};
const _scripts = {};
const loadScript = (src) => (_scripts[src] ||= new Promise((ok, no) => {
  const s = document.createElement("script");
  s.src = src; s.onload = ok; s.onerror = () => no(new Error("Failed to load " + src));
  document.head.appendChild(s);
}));
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const MAMMOTH = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";

async function renderPdf(url, box) {
  await loadScript(PDFJS);
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await pdfjsLib.getDocument({ url }).promise;
  box.innerHTML = "";
  const MAX = 20, n = Math.min(pdf.numPages, MAX);
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const w = box.clientWidth || 760;
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: (w / base.width) * dpr });
    const canvas = document.createElement("canvas");
    canvas.className = "fpage";
    canvas.width = vp.width; canvas.height = vp.height;
    canvas.style.aspectRatio = `${vp.width} / ${vp.height}`;
    box.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  }
  if (pdf.numPages > MAX) box.insertAdjacentHTML("beforeend", `<p class="empty">Showing the first ${MAX} of ${pdf.numPages} pages. Open the full file to see the rest.</p>`);
}

async function renderDocx(url, box) {
  await loadScript(MAMMOTH);
  const buf = await (await fetch(url)).arrayBuffer();
  const res = await mammoth.convertToHtml({ arrayBuffer: buf });
  box.innerHTML = `<div class="fdocx">${res.value || '<p class="empty">This document has no readable text.</p>'}</div>`;
}

// One block per file: caption + open/download links + rendered content
function buildFiles(items) {
  const list = items.filter((i) => safeUrl(i.url));
  if (!list.length) return null;
  const root = document.createElement("div");
  root.className = "files";
  list.forEach((i) => {
    const url = safeUrl(i.url), kind = fileKind(i.url);
    const item = document.createElement("section");
    item.className = "fitem";
    item.innerHTML = `
      <div class="fhead">
        <strong>${esc(i.caption || (kind === "other" ? "File" : "Certificate"))}</strong>
        <span class="fbtns">
          <a class="clink" href="${url}" target="_blank" rel="noopener">Open</a>
          <a class="clink" href="${url}" download>Download</a>
        </span>
      </div>
      <div class="fbody"></div>`;
    root.appendChild(item);
    const body = $(".fbody", item);
    if (kind === "image") {
      body.innerHTML = `<img class="fimg" src="${url}" alt="${esc(i.caption || "")}" loading="lazy">`;
      $("img", body).addEventListener("click", (e) => openLightbox(e.target.src, e.target.alt));
    } else if (kind === "pdf" || kind === "docx") {
      body.innerHTML = '<p class="empty">Loading document…</p>';
      (kind === "pdf" ? renderPdf : renderDocx)(url, body).catch((e) => {
        console.error(e);
        body.innerHTML = `<p class="empty">Could not display this file here. Use “Open” or “Download” above.</p>`;
      });
    } else {
      body.innerHTML = `<p class="empty">This file type can’t be previewed. Use “Open” or “Download” above.</p>`;
    }
  });
  return root;
}

// ---------- Detail page (used by projects & organizations) ----------
const factList = (pairs) =>
  `<dl class="facts">${pairs.filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;

async function renderDetail({ table, imgTable, fk, backHref, backLabel, notFound, side, files = false }) {
  const root = $("#detail");
  if (files) { // start downloading the PDF/DOCX libraries now, in parallel with the database query
    loadScript(PDFJS).catch(() => {});
    document.head.appendChild(Object.assign(document.createElement("link"), { rel: "prefetch", as: "script", href: PDFJS_WORKER }));
    document.head.appendChild(Object.assign(document.createElement("link"), { rel: "prefetch", as: "script", href: MAMMOTH }));
  }
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { root.innerHTML = `<p class="empty">${notFound}</p>`; return; }
  try {
    const [rowRes, imgRes, prof] = await Promise.all([
      sb.from(table).select("*").eq("id", id).maybeSingle(),
      byOrder(sb.from(imgTable).select("*").eq(fk, id)),
      sb.from("profile").select("name").eq("id", 1).maybeSingle(),
    ]);
    if (rowRes.error) throw rowRes.error;
    if (imgRes.error) throw imgRes.error;
    const r = rowRes.data;
    if (!r) { root.innerHTML = `<p class="empty">${notFound}</p>`; return; }

    const title = r.title || r.name || "";
    if (prof.data?.name) $("#brand").textContent = prof.data.name;
    document.title = `${title} — ${prof.data?.name || "Portfolio"}`;

    const items = [
      ...(safeUrl(r.cover_url) ? [{ url: r.cover_url, caption: "" }] : []),
      ...imgRes.data.map((i) => ({ url: i.image_url, caption: i.caption })),
    ];

    const sideHtml = side(r);
    root.innerHTML = `
      <a class="back" href="${backHref}">${backLabel}</a>
      <h1 class="dtitle">${esc(title)}</h1>
      ${r.summary ? `<p class="dlead">${esc(r.summary)}</p>` : ""}
      ${sideHtml ? `<div class="dmeta">${sideHtml}</div>` : ""}
      <div class="dbody">${r.description ? `<p>${esc(r.description)}</p>` : `<p class="empty">No full description yet.</p>`}</div>
      <div id="slider-slot"></div>`;

    const slider = files ? buildFiles(items) : buildSlider(items);
    if (slider) $("#slider-slot").appendChild(slider);
  } catch (e) {
    console.error(e);
    root.innerHTML = `<p class="empty">Failed to load this page.</p>`;
  }
}
