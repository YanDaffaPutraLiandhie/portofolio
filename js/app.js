const empty = (msg) => `<p class="empty">${msg}</p>`;

function renderProfile(p, socials) {
  const name = p.name || "";
  document.title = name ? `${name} — Portfolio` : "Portfolio";
  $("#brand").textContent = name || "Portfolio";
  $("#name").textContent = name || "Name not set";
  $("#headline").textContent = p.headline || "";
  $("#bio").textContent = p.bio || "";
  $("#footer").innerHTML = `<span>© ${new Date().getFullYear()} ${esc(name)}</span>`;

  $("#photo").innerHTML = `<div class="avatar">${safeUrl(p.photo_url)
    ? `<img src="${safeUrl(p.photo_url)}" alt="Photo of ${esc(name)}">`
    : `<span class="initial">${esc((name.trim()[0] || "?").toUpperCase())}</span>`}</div>`;

  const actions = [];
  if (safeUrl(p.cv_url)) actions.push(`<a class="btn primary" href="${safeUrl(p.cv_url)}" target="_blank" rel="noopener">CV</a>`);
  if (p.email) actions.push(`<a class="btn" href="mailto:${esc(p.email)}">Email</a>`);
  socials.forEach((s) => {
    if (safeUrl(s.url)) actions.push(`<a class="btn" href="${safeUrl(s.url)}" target="_blank" rel="noopener">${esc(s.platform)}</a>`);
  });
  $("#actions").innerHTML = actions.join("");
}

// "developer.ts" code window, built from real profile data
function renderDevCard(p, skills, counts) {
  const stack = skills.filter((s) => s.type === "hard")
    .sort((a, b) => (Number(b.level) || 0) - (Number(a.level) || 0))
    .slice(0, 4).map((s) => s.name);
  const str = (v) => `<span class="s">"${esc(v)}"</span>`;
  const row = (k, v) => `  <span class="p">${k}</span>: ${v},`;
  const rows = [];
  if (p.location) rows.push(row("location", str(p.location)));
  if (p.email) rows.push(row("email", str(p.email)));

  rows.push(row("projects", `<span class="n">${counts.projects}</span>`));
  rows.push(row("certifications", `<span class="n">${counts.certifications}</span>`));
  $("#devcard").innerHTML = `
    <div class="bar"><i class="dot r"></i><i class="dot y"></i><i class="dot g"></i><span>developer.ts</span></div>
    <pre><span class="c">// profile</span>
<span class="k">const</span> developer = {
${rows.join("\n")}
};<span class="caret"></span></pre>`;
}

const techTags = (p) => {
  const t = (p.tech || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3);
  return t.length ? `<div class="tags">${t.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : "";
};

function renderProjects(list) {
  const box = $("#projects");
  box.innerHTML = list.length
    ? list.map((p) => `
      <a class="pcard" href="project.html?id=${encodeURIComponent(p.id)}">
        ${safeUrl(p.cover_url)
          ? `<img src="${safeUrl(p.cover_url)}" alt="" loading="lazy">`
          : `<div class="ph">${esc((p.title.trim()[0] || "?").toUpperCase())}</div>`}
        <div class="ov">
          <h3>${esc(p.title)}</h3>
          ${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
          ${techTags(p)}
        </div>
      </a>`).join("")
    : empty("No projects yet.");
  if (!list.length) return;

  // Title + arrow buttons on one row
  const section = $("#proyek");
  const bar = document.createElement("div");
  bar.className = "cnav";
  bar.innerHTML = `<button class="cbtn" aria-label="Previous">&#8249;</button><button class="cbtn" aria-label="Next">&#8250;</button>`;
  $("#proyek .head").appendChild(bar);

  const step = () => (box.firstElementChild?.getBoundingClientRect().width || 300) + 16;
  const [prev, next] = bar.querySelectorAll(".cbtn");
  const move = (dir) => box.scrollBy({ left: dir * step(), behavior: reduceMotion ? "auto" : "smooth" });
  prev.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));

  // Continuous scroll to the right (seamless loop). Pauses on hover / touch.
  if (reduceMotion || list.length < 2) return;
  const gap = 16;
  [...box.children].forEach((c) => {
    const k = c.cloneNode(true);
    k.setAttribute("aria-hidden", "true");
    k.tabIndex = -1;
    box.appendChild(k);
  });
  const SPEED = 30; // px per second
  let pos = box.scrollLeft, last = performance.now(), hover = false, touched = 0;
  section.addEventListener("mouseenter", () => (hover = true));
  section.addEventListener("mouseleave", () => (hover = false));
  ["pointerdown", "touchstart", "wheel", "keydown"].forEach((ev) =>
    section.addEventListener(ev, () => (touched = performance.now()), { passive: true }));
  prev.addEventListener("click", () => (touched = performance.now()));
  next.addEventListener("click", () => (touched = performance.now()));
  const tick = (now) => {
    const dt = Math.min(now - last, 100) / 1000;
    last = now;
    if (hover || document.hidden || now - touched < 2500) {
      pos = box.scrollLeft; // follow the user's manual position
    } else {
      const half = (box.scrollWidth + gap) / 2;
      pos += SPEED * dt;
      if (pos >= half) pos -= half;
      box.scrollLeft = pos;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderOrgs(list) {
  $("#orgs").innerHTML = list.length
    ? list.map((o) => {
        const thumb = safeUrl(o.cover_url);
        const text = o.summary || o.description || "";
        return `
      <a class="ocard${thumb ? "" : " nothumb"}" href="organization.html?id=${encodeURIComponent(o.id)}">
        ${thumb ? `<div class="oimg"><img src="${thumb}" alt="" loading="lazy"></div>` : ""}
        <div>
          <h3>${esc(o.name)}</h3>
          <div class="sub">${[o.role, o.period].filter(Boolean).map(esc).join(" — ")}</div>
          ${text ? `<p>${esc(text)}</p>` : ""}
        </div>
      </a>`;
      }).join("")
    : empty("No organizations yet.");
}

function renderCerts(list) {
  $("#certs").innerHTML = list.length
    ? list.map((c) => {
        const href = `certification.html?id=${encodeURIComponent(c.id)}`;
        return `
      <div class="crow">
        <span class="yr">${esc(c.year)}</span>
        <div><strong><a href="${href}">${esc(c.name)}</a></strong>${c.issuer ? `<div class="sub">${esc(c.issuer)}</div>` : ""}</div>
        <div class="clinks">
          <a class="clink" href="${href}">Details</a>
          ${safeUrl(c.credential_url) ? `<a class="clink" href="${safeUrl(c.credential_url)}" target="_blank" rel="noopener">View credential</a>` : ""}
        </div>
      </div>`;
      }).join("")
    : empty("No certifications yet.");
}

function renderTools(list) {
  $("#tools-list").innerHTML = list.length
    ? list.map((t) => `<span class="chip">${esc(t.name)}${t.category ? `<small>${esc(t.category)}</small>` : ""}</span>`).join("")
    : empty("No tools yet.");
}

function renderSkills(list) {
  const hard = list.filter((s) => s.type === "hard");
  const soft = list.filter((s) => s.type === "soft");
  const pct = (s) => Math.min(100, Math.max(0, Number(s.level) || 0));
  // Hard skills are chips like soft skills (small percentage next to the name)
  $("#hard").innerHTML = hard.length
    ? hard.map((s) => `<span class="chip">${esc(s.name)}<small>${pct(s)}%</small></span>`).join("")
    : empty("No hard skills yet.");
  $("#soft").innerHTML = soft.length
    ? soft.map((s) => `<span class="chip">${esc(s.name)}</span>`).join("")
    : empty("No soft skills yet.");
}

// Highlight the nav link of the section currently in view
function initNavSpy() {
  const links = [...document.querySelectorAll('.nav nav a[href^="#"]')];
  const items = links.map((a) => [a, $(a.getAttribute("href"))]).filter(([, el]) => el);
  if (!items.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    let cur = null;
    items.forEach(([a, el]) => { if (el.getBoundingClientRect().top <= 120) cur = a; });
    links.forEach((a) => a.classList.toggle("on", a === cur));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

async function init() {
  try {
    const [profile, socials, projects, orgs, certs, tools, skills] = await Promise.all([
      sb.from("profile").select("*").eq("id", 1).maybeSingle(),
      byOrder(sb.from("social_links").select("*")),
      byOrder(sb.from("projects").select("*")),
      byOrder(sb.from("organizations").select("*")),
      byOrder(sb.from("certifications").select("*")),
      byOrder(sb.from("tools").select("*")),
      byOrder(sb.from("skills").select("*")),
    ]);
    for (const r of [profile, socials, projects, orgs, certs, tools, skills]) if (r.error) throw r.error;

    renderProfile(profile.data || {}, socials.data);
    renderDevCard(profile.data || {}, skills.data, { projects: projects.data.length, certifications: certs.data.length });
    renderProjects(projects.data);
    renderOrgs(orgs.data);
    renderCerts(certs.data);
    renderTools(tools.data);
    renderSkills(skills.data);
    initNavSpy();
  } catch (e) {
    console.error(e);
    $("#name").textContent = "Failed to load data";
    $("#bio").textContent = "Check js/config.js (Supabase URL & key), make sure the SQL has been run, then see the error message in the Console (F12).";
  }
}
init();