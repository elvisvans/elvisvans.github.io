/** BayStay shared helpers — coastal v2 */
const PRICE_LABELS = { 1: "經濟 $", 2: "中檔 $$", 3: "舒適 $$$", 4: "豪華 $$$$" };
const REGION_LABELS = { gba: "大灣區", asia: "亞洲熱門" };
const COUNTRY_LABELS = { MO: "澳門", CN: "中國", HK: "香港", TH: "泰國", JP: "日本", KR: "韓國" };

const CITY_CHIPS = [
  { key: "", label: "全部" },
  { key: "macau", label: "澳門" },
  { key: "guangzhou", label: "廣州" },
  { key: "zhuhai", label: "珠海" },
  { key: "shenzhen", label: "深圳" },
  { key: "hongkong", label: "香港" },
  { sep: true },
  { key: "bangkok", label: "曼谷" },
  { key: "chiangmai", label: "清邁" },
  { key: "tokyo", label: "東京" },
  { key: "osaka", label: "大阪" },
  { key: "seoul", label: "首爾" },
  { key: "jeju", label: "濟州" },
];

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";

const CACHE_V = "20261019b";

async function loadListings() {
  const res = await fetch("data/listings.json?v=" + CACHE_V);
  if (!res.ok) throw new Error("無法載入 listings.json（請用本機靜態伺服器開啟）");
  const data = await res.json();
  const listings = (data.listings || []).filter(
    (l) => l.status === "published"
  );
  return { site: data.site, listings };
}

/** Append UTM at render-time; does not mutate listings.json fields. */
function withUtm(url, params) {
  if (!url) return url;
  try {
    const u = new URL(url, typeof location !== "undefined" ? location.href : "https://elvisvans.github.io");
    Object.keys(params || {}).forEach((k) => {
      if (params[k] != null && params[k] !== "") u.searchParams.set(k, params[k]);
    });
    return u.toString();
  } catch (e) {
    const sep = String(url).indexOf("?") >= 0 ? "&" : "?";
    const qs = Object.keys(params || {})
      .filter((k) => params[k] != null && params[k] !== "")
      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
      .join("&");
    return qs ? url + sep + qs : url;
  }
}

/** Featured primary booking CTA only. */
function featuredBookingUrl(l) {
  const raw = l && l.booking_url;
  if (!raw) return "";
  if (l.featured === true) {
    return withUtm(raw, {
      utm_source: "baystay",
      utm_medium: "cta",
      utm_campaign: "featured",
    });
  }
  return raw;
}

function priceLabel(tier) {
  return PRICE_LABELS[tier] || `價位 ${tier}`;
}

function stars(score) {
  const n = Math.round(Number(score) || 0);
  return "★".repeat(Math.min(5, Math.max(0, n))) + "☆".repeat(Math.max(0, 5 - n));
}

function listingImage(l) {
  if (Array.isArray(l.photos) && l.photos.length) {
    const p = l.photos[0];
    if (typeof p === "string" && p) return p;
    if (p && (p.url || p.src)) return p.url || p.src;
  }
  return l.photo || l.image_url || l.cover_image || FALLBACK_IMG;
}

function nearbyFoodItems(l) {
  const raw = l.nearby_food || l.nearby_foods || [];
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr
    .map((x) => {
      if (!x) return "";
      if (typeof x === "string") return x.trim();
      return (x.name_zh || x.name || x.title || "").trim();
    })
    .filter(Boolean)
    .slice(0, 2);
}

function priceSymbols(tier) {
  const n = Math.min(4, Math.max(1, Number(tier) || 1));
  return "$".repeat(n);
}

function prefersReducedMotion() {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function cardHTML(l) {
  const img = listingImage(l);
  const tagLine = l.featured
    ? `<span class="tag">精選</span>`
    : `<span class="city-label">${escapeHtml(l.city)}</span>`;
  const bits = [];
  if ((l.tags || []).length) bits.push((l.tags || []).slice(0, 2).join(" · "));
  if (l.family_friendly) bits.push("親子友善");
  bits.push(priceSymbols(l.price_tier));
  const highs = (l.highlights || []).filter(Boolean).slice(0, 3);
  const highHtml = highs.length
    ? `<ul class="card-highlights">${highs.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`
    : "";
  const foods = nearbyFoodItems(l);
  const foodHtml = foods.length
    ? `<p class="card-food"><span class="food-label">附近美食</span> ${foods.map(escapeHtml).join(" · ")}</p>`
    : "";
  const safeImg = escapeHtml(img);
  const imgDiv = prefersReducedMotion()
    ? `<div class="card-img is-loaded" style="background-image:url('${safeImg}')" role="img" aria-label="${escapeHtml(l.name_zh)}"></div>`
    : `<div class="card-img" data-src="${safeImg}" role="img" aria-label="${escapeHtml(l.name_zh)}"></div>`;
  return `
    <article class="card">
      <a href="listing.html?id=${encodeURIComponent(l.id)}" style="display:contents;color:inherit;text-decoration:none">
        ${imgDiv}
        <div class="card-body">
          ${tagLine}
          <h3>${escapeHtml(l.name_zh)}</h3>
          <p class="one-liner">${escapeHtml(bits.join(" · "))}</p>
          ${highHtml}
          ${foodHtml}
        </div>
      </a>
    </article>`;
}

/** Fade-in card background images after cardHTML insert. */
function hydrateCardImages(root) {
  const scope = root && root.querySelectorAll ? root : document;
  const reduce = prefersReducedMotion();
  scope.querySelectorAll(".card-img[data-src]").forEach((el) => {
    const url = el.getAttribute("data-src");
    if (!url) return;
    if (reduce) {
      el.style.backgroundImage = "url('" + url + "')";
      el.classList.add("is-loaded");
      el.removeAttribute("data-src");
      return;
    }
    const img = new Image();
    img.onload = function () {
      el.style.backgroundImage = "url('" + url + "')";
      el.classList.add("is-loaded");
      el.removeAttribute("data-src");
    };
    img.onerror = function () {
      el.style.backgroundImage = "url('" + FALLBACK_IMG + "')";
      el.classList.add("is-loaded");
      el.removeAttribute("data-src");
    };
    img.src = url;
  });
}

/** Soft Lift P1: IntersectionObserver reveal; unobserve after first reveal. */
function initMotionReveal(selector) {
  const sel = selector || ".motion-reveal";
  const nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
  if (!nodes.length) return;
  if (prefersReducedMotion()) {
    nodes.forEach((el) => el.classList.add("is-revealed"));
    return;
  }
  if (typeof IntersectionObserver === "undefined") {
    nodes.forEach((el) => el.classList.add("is-revealed"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );
  nodes.forEach((el) => io.observe(el));
}

function countByCityKey(listings) {
  const c = {};
  for (const l of listings) {
    const k = l.city_key || "other";
    c[k] = (c[k] || 0) + 1;
  }
  return c;
}

/** Render city chips into container. opts: { active, counts, onSelect } */
function renderCityChips(container, opts = {}) {
  const active = opts.active || "";
  const counts = opts.counts || {};
  const showCounts = !!opts.showCounts;
  container.innerHTML = CITY_CHIPS.map((c) => {
    if (c.sep) return `<span class="chip-sep">｜</span>`;
    const on = c.key === active ? " on" : "";
    const n = c.key === "" ? "" : showCounts ? ` <span class="chip-n">(${counts[c.key] || 0})</span>` : "";
    return `<button type="button" class="chip${on}" data-city="${c.key}">${c.label}${n}</button>`;
  }).join("");
  container.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (typeof opts.onSelect === "function") opts.onSelect(btn.getAttribute("data-city") || "");
    });
  });
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

/* Explicit globals for Safari / cached scopes */
window.CITY_CHIPS = CITY_CHIPS;
window.CACHE_V = CACHE_V;
window.loadListings = loadListings;
window.withUtm = withUtm;
window.featuredBookingUrl = featuredBookingUrl;
window.priceLabel = priceLabel;
window.stars = stars;
window.listingImage = listingImage;
window.nearbyFoodItems = nearbyFoodItems;
window.priceSymbols = priceSymbols;
window.cardHTML = cardHTML;
window.prefersReducedMotion = prefersReducedMotion;
window.hydrateCardImages = hydrateCardImages;
window.initMotionReveal = initMotionReveal;
window.countByCityKey = countByCityKey;
window.renderCityChips = renderCityChips;
window.escapeHtml = escapeHtml;
window.qs = qs;
window.PRICE_LABELS = PRICE_LABELS;
window.REGION_LABELS = REGION_LABELS;
window.COUNTRY_LABELS = COUNTRY_LABELS;
