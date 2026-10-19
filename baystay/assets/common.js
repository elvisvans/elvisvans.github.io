/** BayStay shared helpers — LN editorial v1 + coastal */
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
  { key: "phuket", label: "普吉" },
  { key: "huahin", label: "華欣" },
  { key: "samui", label: "蘇梅" },
  { key: "tokyo", label: "東京" },
  { key: "osaka", label: "大阪" },
  { key: "kyoto", label: "京都" },
  { key: "hakone", label: "箱根" },
  { key: "okinawa", label: "沖繩" },
  { key: "seoul", label: "首爾" },
  { key: "jeju", label: "濟州" },
  { key: "busan", label: "釜山" },
];

const FALLBACK_IMG = (function () {
  try {
    if (typeof document !== "undefined" && document.currentScript && document.currentScript.src) {
      return new URL("cover-fallback.jpg", document.currentScript.src).href;
    }
  } catch (e) {}
  return "assets/cover-fallback.jpg";
})();

const CACHE_V = "20261019r";

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

function cardBits(l) {
  const bits = [];
  if ((l.tags || []).length) bits.push((l.tags || []).slice(0, 2).join(" · "));
  if (l.family_friendly) bits.push("親子友善");
  bits.push(priceSymbols(l.price_tier));
  return bits.join(" · ");
}

function imgDivHTML(l, extraClass) {
  const img = listingImage(l);
  const safeImg = escapeHtml(img);
  const cls = (extraClass || "card-img").trim();
  if (prefersReducedMotion()) {
    return `<div class="${cls} is-loaded" style="background-image:url('${safeImg}')" role="img" aria-label="${escapeHtml(l.name_zh)}"></div>`;
  }
  return `<div class="${cls}" data-src="${safeImg}" role="img" aria-label="${escapeHtml(l.name_zh)}"></div>`;
}

function cardHTML(l) {
  const tagLine = l.featured
    ? `<span class="tag">精選</span>`
    : `<span class="city-label">${escapeHtml(l.city)}</span>`;
  const highs = (l.highlights || []).filter(Boolean).slice(0, 3);
  const highHtml = highs.length
    ? `<ul class="card-highlights">${highs.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`
    : "";
  const foods = nearbyFoodItems(l);
  const foodHtml = foods.length
    ? `<p class="card-food"><span class="food-label">附近美食</span> ${foods.map(escapeHtml).join(" · ")}</p>`
    : "";
  return `
    <article class="card">
      <a href="listing.html?id=${encodeURIComponent(l.id)}" style="display:contents;color:inherit;text-decoration:none">
        ${imgDivHTML(l, "card-img")}
        <div class="card-body">
          ${tagLine}
          <h3>${escapeHtml(l.name_zh)}</h3>
          <p class="one-liner">${escapeHtml(cardBits(l))}</p>
          ${highHtml}
          ${foodHtml}
        </div>
      </a>
    </article>`;
}

/** LN home Featured card (.feat-card). */
function featCardHTML(l) {
  const one = (l.highlights && l.highlights[0]) || cardBits(l);
  return `
    <a class="feat-card" href="listing.html?id=${encodeURIComponent(l.id)}">
      ${imgDivHTML(l, "img card-img")}
      <div class="body">
        <p class="city">${escapeHtml(l.city || "")}</p>
        <h3>${escapeHtml(l.name_zh)}</h3>
        <p>${escapeHtml(one)}</p>
      </div>
    </a>`;
}

/** LN listings directory card (.dir-card). */
function dirCardHTML(l) {
  const tags = (l.tags || []).slice(0, 3);
  const tagHtml = tags.length
    ? `<div class="tags">${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>`
    : "";
  const one =
    (l.highlights && l.highlights[0]) ||
    (l.one_liner || l.summary || cardBits(l));
  return `
    <a class="dir-card" href="listing.html?id=${encodeURIComponent(l.id)}">
      ${imgDivHTML(l, "img card-img")}
      <div class="body">
        <p class="city">${escapeHtml(l.city || "")}</p>
        <h2>${escapeHtml(l.name_zh)}</h2>
        <p class="one">${escapeHtml(one)}</p>
        ${tagHtml}
        <p class="price">${escapeHtml(priceLabel(l.price_tier))}</p>
      </div>
    </a>`;
}

/** Fade-in card background images after cardHTML / feat / dir insert. */
function hydrateCardImages(root) {
  const scope = root && root.querySelectorAll ? root : document;
  const reduce = prefersReducedMotion();
  scope.querySelectorAll(".card-img[data-src], .img[data-src]").forEach((el) => {
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
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  nodes.forEach((el) => io.observe(el));
}

/**
 * M2 chapter-nav scroll-spy (topic page).
 * Marks matching pill with .is-active + .on; scrolls active pill into view on mobile.
 */
function initChapterNavSpy(navSelector) {
  const nav = document.querySelector(navSelector || ".chapter-nav");
  if (!nav) return;
  const links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;

  const pairs = links
    .map((a) => {
      const id = (a.getAttribute("href") || "").slice(1);
      const section = id ? document.getElementById(id) : null;
      return section ? { a: a, section: section, id: id } : null;
    })
    .filter(Boolean);
  if (!pairs.length) return;

  function setActive(id) {
    links.forEach((a) => {
      const match = (a.getAttribute("href") || "") === "#" + id;
      a.classList.toggle("is-active", match);
      a.classList.toggle("on", match);
      if (match) {
        try {
          a.scrollIntoView({
            inline: "nearest",
            block: "nearest",
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          });
        } catch (e) { /* ignore */ }
      }
    });
  }

  if (typeof IntersectionObserver === "undefined") {
    setActive(pairs[0].id);
    return;
  }

  let current = "";
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!visible.length) return;
      const id = visible[0].target.id;
      if (id && id !== current) {
        current = id;
        setActive(id);
      }
    },
    { rootMargin: "-18% 0px -55% 0px", threshold: [0, 0.15, 0.35, 0.55] }
  );
  pairs.forEach((p) => io.observe(p.section));
}


/** Soft PASS 0.93 Phase1: exact city_key match. */
function matchesCityChip(listing, cityKey) {
  if (!cityKey) return true;
  const raw = listing && listing.city_key != null ? String(listing.city_key) : "";
  return raw === cityKey;
}

function countByCityKey(listings) {
  const c = {};
  for (const l of listings) {
    const k = l.city_key || "other";
    c[k] = (c[k] || 0) + 1;
  }
  return c;
}

/** Render city chips into container. opts: { active, counts, onSelect } — uses .chip.on (M1 no spring). */
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
window.featCardHTML = featCardHTML;
window.dirCardHTML = dirCardHTML;
window.prefersReducedMotion = prefersReducedMotion;
window.hydrateCardImages = hydrateCardImages;
window.initMotionReveal = initMotionReveal;
window.initChapterNavSpy = initChapterNavSpy;
window.matchesCityChip = matchesCityChip;
window.countByCityKey = countByCityKey;
window.renderCityChips = renderCityChips;
window.escapeHtml = escapeHtml;
window.qs = qs;
window.PRICE_LABELS = PRICE_LABELS;
window.REGION_LABELS = REGION_LABELS;
window.COUNTRY_LABELS = COUNTRY_LABELS;
