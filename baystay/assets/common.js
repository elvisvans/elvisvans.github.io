/** BayStay shared helpers */
const PRICE_LABELS = { 1: "經濟 $", 2: "中檔 $$", 3: "舒適 $$$", 4: "豪華 $$$$" };
const REGION_LABELS = { gba: "大灣區", asia: "亞洲熱門" };
const COUNTRY_LABELS = { MO: "澳門", CN: "中國", HK: "香港", TH: "泰國", JP: "日本", KR: "韓國" };

async function loadListings() {
  const res = await fetch("data/listings.json");
  if (!res.ok) throw new Error("無法載入 listings.json（請用本機靜態伺服器開啟）");
  const data = await res.json();
  const listings = (data.listings || []).filter(
    (l) => l.status === "published" && l.non_gaming === true
  );
  return { site: data.site, listings };
}

function priceLabel(tier) {
  return PRICE_LABELS[tier] || `價位 ${tier}`;
}

function stars(score) {
  const n = Math.round(Number(score) || 0);
  return "★".repeat(Math.min(5, Math.max(0, n))) + "☆".repeat(Math.max(0, 5 - n));
}

function cardHTML(l) {
  const tags = (l.tags || []).slice(0, 4).map((t) => `<span class="badge">${t}</span>`).join("");
  const featured = l.featured ? `<span class="badge featured">精選</span>` : "";
  return `
    <article class="card">
      <div class="badge-row">${featured}<span class="badge tier">${priceLabel(l.price_tier)}</span>${l.family_friendly ? '<span class="badge">親子</span>' : ""}</div>
      <h3><a href="listing.html?id=${encodeURIComponent(l.id)}">${escapeHtml(l.name_zh)}</a></h3>
      <div class="en">${escapeHtml(l.name_en || "")}</div>
      <div class="meta">${REGION_LABELS[l.region] || l.region} · ${escapeHtml(l.city)} · ${stars(l.editor_score)}</div>
      <p class="one-liner">${escapeHtml(l.one_liner_zh || "")}</p>
      <div class="badge-row">${tags}</div>
    </article>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}
