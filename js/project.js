renderDetail({
  table: "projects",
  imgTable: "project_images",
  fk: "project_id",
  backHref: "index.html#proyek",
  backLabel: "Back to projects",
  notFound: "Project not found.",
  side: (p) => {
    const tech = (p.tech || "").split(",").map((t) => t.trim()).filter(Boolean);
    return (
      factList([
        p.period && ["Period", esc(p.period)],
        p.role && ["Role", esc(p.role)],
        tech.length && ["Technologies", `<span class="chips">${tech.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</span>`],
      ]) +
      (safeUrl(p.link_url) ? `<a class="btn primary" href="${safeUrl(p.link_url)}" target="_blank" rel="noopener">Open project</a>` : "")
    );
  },
});