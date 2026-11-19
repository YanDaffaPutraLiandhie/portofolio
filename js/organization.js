renderDetail({
  table: "organizations",
  imgTable: "organization_images",
  fk: "organization_id",
  backHref: "index.html#organisasi",
  backLabel: "Back to organizations",
  notFound: "Organization not found.",
  side: (o) => factList([
    o.role && ["Position", esc(o.role)],
    o.period && ["Period", esc(o.period)],
  ]) || "",
});
