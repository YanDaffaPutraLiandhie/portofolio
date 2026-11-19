renderDetail({
  table: "certifications",
  imgTable: "certification_images",
  fk: "certification_id",
  backHref: "index.html#sertifikasi",
  backLabel: "Back to certifications",
  notFound: "Certification not found.",
  files: true, // show PDF / DOCX / image contents instead of a photo carousel
  side: (c) =>
    factList([
      c.issuer && ["Issuer", esc(c.issuer)],
      c.year && ["Year", esc(c.year)],
    ]) +
    (safeUrl(c.credential_url) ? `<a class="btn primary" href="${safeUrl(c.credential_url)}" target="_blank" rel="noopener">View credential</a>` : ""),
});