const $ = (id) => document.getElementById(id);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Destinations: add photos as /static/img/<slug>.jpg and they replace the artwork automatically */
const DEST = [
  { n: "Tokyo", img: "photo-1753517457294-2bf4694e3760", e: "🗼", a: "#ff8fab", b: "#7b6cf6" }, { n: "Bali", img: "photo-1559628233-100c798642d4", e: "🌴", a: "#2ec4b6", b: "#ffd166" },
  { n: "Paris", e: "🥐", a: "#8ecae6", b: "#f4a6c0" }, { n: "Dubai", e: "🏙️", a: "#ffb347", b: "#ff6f91" },
  { n: "Bangkok", e: "🛕", a: "#ffd166", b: "#ef476f" }, { n: "Istanbul", e: "🕌", a: "#5eead4", b: "#3b82f6" },
  { n: "Rome", e: "🏛️", a: "#fbbf77", b: "#f87171" }, { n: "Maldives", e: "🏝️", a: "#22d3ee", b: "#34d399" }
];
const byName = (n) => DEST.find((d) => d.n.toLowerCase() === String(n).toLowerCase().trim());
const photo = (d, w = 900) => d.img ? `https://images.unsplash.com/${d.img}?auto=format&fit=crop&w=${w}&q=70` : `/static/img/${slug(d.n)}.jpg`;
const slug = (n) => n.toLowerCase().replace(/\s+/g, "-");
function scene(d, label = true) {
  return `<div class="scene" data-e="${d.e}" style="--a:${d.a};--b:${d.b}"><img src="${photo(d)}" alt="${d.n}" loading="lazy" onerror="this.remove()">${label ? `<b>${d.n}</b>` : ""}</div>`;
}
document.querySelectorAll(".card[data-city]").forEach((c) => c.innerHTML = scene(byName(c.dataset.city)));
$("destRow").innerHTML = DEST.map((d) => `<button type="button" class="scene-wrap rv" data-n="${d.n}" aria-label="Plan a trip to ${d.n}">${scene(d)}</button>`).join("");
$("destRow").onclick = (e) => { const b = e.target.closest("[data-n]"); if (b) { $("to").value = b.dataset.n; scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); setTimeout(() => $("days").focus(), 500); } };
$("mq1").innerHTML = [...DEST, ...DEST].map((d) => `<span>${d.n}</span>`).join("");
const PERKS = ["Live flight data", "Hotels that fit your budget", "Day-by-day itineraries", "Budget estimates", "Download as PDF", "Powered by AI agents"];
$("mq2").innerHTML = [...PERKS, ...PERKS, ...PERKS].map((p) => `<span>${p}</span>`).join("");

/* Scroll reveal + hero parallax */
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { threshold: 0, rootMargin: "0px 0px -6% 0px" });
document.querySelectorAll(".rv").forEach((el, i) => { el.style.transitionDelay = (i % 4) * 0.1 + "s"; io.observe(el); });
if (!reduce) addEventListener("pointermove", (e) => {
  const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
  document.querySelectorAll("[data-depth]").forEach((el) => { const d = +el.dataset.depth; el.style.transform = `translate(${-x * d}px,${-y * d}px) rotateY(${x * 8}deg)`; });
});

/* Planner */
const STAGES = [0, 4000, 9000, 20000], SECTIONS = ["Trip Summary", "Flight Information", "Hotel Suggestions", "Day-by-Day Itinerary", "Estimated Budget", "Final Recommendations"];
const ICONS = { "Trip Summary": "📍", "Flight Information": "🛫", "Hotel Suggestions": "🏨", "Day-by-Day Itinerary": "🗺️", "Estimated Budget": "💰", "Final Recommendations": "✨" };
let timers = [], latest = "", place = "";
const showError = (m) => { $("errorBox").textContent = m; $("errorBox").classList.remove("hidden"); };
function loader(on) {
  timers.forEach(clearTimeout); timers = [];
  const li = [...document.querySelectorAll("#pipeline li")]; li.forEach((s) => s.className = ""); $("routePlane").style.left = "0";
  $("loader").classList.toggle("hidden", !on);
  if (on) STAGES.forEach((ms, i) => timers.push(setTimeout(() => { li.forEach((s, j) => s.className = j < i ? "done" : j === i ? "active" : ""); $("routePlane").style.left = i * 25 + "%"; }, ms)));
}
$("finder").addEventListener("submit", async (e) => {
  e.preventDefault(); $("errorBox").classList.add("hidden");
  place = $("to").value.trim(); if (!place) return showError("Tell us where you’d like to go.");
  const from = $("from").value.trim(), days = $("days").value || 5, budget = $("budget").value.trim(), notes = $("notes").value.trim();
  const message = `Plan a complete ${days}-day ${place} trip${from ? " from " + from : ""} including flights, hotels and sightseeing${budget ? " under " + budget : ""}.${notes ? " " + notes : ""}`;
  $("sendBtn").disabled = true; loader(true);
  try {
    const res = await fetch("/api/travel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, thread_id: null }) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong. Please try again.");
    timers.forEach(clearTimeout); document.querySelectorAll("#pipeline li").forEach((s) => s.className = "done"); $("routePlane").style.left = "calc(100% - 40px)";
    await new Promise((r) => setTimeout(r, 700)); loader(false); showResult(data);
  } catch (err) { loader(false); showError(err.message); }
  finally { $("sendBtn").disabled = false; }
});

const KEYS = [["Trip Summary", /summary|overview/i], ["Flight Information", /flight/i], ["Hotel Suggestions", /hotel|stay|accommodation/i], ["Day-by-Day Itinerary", /itinerary|day.by.day/i], ["Estimated Budget", /budget|cost/i], ["Final Recommendations", /recommend|tips|final/i]];
function splitSections(md) {
  const strict = new RegExp("^\\W*(?:\\d+\\.\\s*)?\\W*(" + SECTIONS.join("|") + ")", "i"), out = []; let cur = { title: "Full plan", body: [] };
  for (const l of md.split("\n")) {
    let key = null, m = l.match(strict);
    if (m) key = SECTIONS.find((x) => x.toLowerCase() === m[1].toLowerCase());
    else if (/^\s{0,3}#{1,3}\s+/.test(l) && !/^\W*Day\s*\d/i.test(l.replace(/^\s*#+\s*/, ""))) { const k = KEYS.find(([, r]) => r.test(l)); if (k) key = k[0]; }
    if (key) { if (cur.body.join("").trim()) out.push(cur); cur = { title: key, body: [] }; } else cur.body.push(l);
  }
  out.push(cur); return out.length > 1 ? out : [{ title: "Full plan", body: md.split("\n") }];
}
const render = (md) => DOMPurify.sanitize(marked.parse(md));
function dayCards(md) {
  const parts = []; let cur = null;
  md.split("\n").forEach((l) => { const m = l.match(/^\W*Day\s*(\d+)\b/i); if (m) { cur = { n: m[1], body: [l] }; parts.push(cur); } else if (cur) cur.body.push(l); });
  return parts.length < 2 ? null : '<div class="days">' + parts.map((p) => `<div class="day rv"><div class="badge">DAY<br>${p.n}</div><div class="day-card prose">${render(p.body.join("\n"))}</div></div>`).join("") + "</div>";
}
function showResult(data, fresh = true) {
  latest = data.answer; glance(data); if (fresh) { saveRecent(data); confetti(); } const box = $("resultBox"), jump = $("jump"); box.innerHTML = jump.innerHTML = "";
  const d = byName(place), img = d ? `<img src="/static/img/${slug(d.n)}.jpg" alt="" onerror="this.remove()">` : "";
  $("banner").querySelectorAll("img").forEach((i) => i.remove()); $("banner").insertAdjacentHTML("afterbegin", img);
  $("banner").style.background = d ? `linear-gradient(120deg,${d.a},${d.b})` : "";
  $("bannerTitle").textContent = `${d ? d.e + " " : "🌍 "}Your trip to ${place}`;
  $("threadInfo").textContent = `Plan ID ${data.thread_id} · ${data.llm_calls} agent steps`;
  splitSections(data.answer).forEach((s, i) => {
    const md = s.body.join("\n"); if (!md.trim()) return;
    const el = document.createElement("section"); el.className = "sec rv"; el.id = "s" + i; el.dataset.k = s.title;
    const body = ((s.title === "Day-by-Day Itinerary" || s.title === "Full plan") && dayCards(md)) || `<div class="prose">${render(md)}</div>`;
    el.innerHTML = `<div class="sec-head"><span class="ic">${ICONS[s.title] || "🌍"}</span><h3>${s.title === "Full plan" ? "Your trip plan" : s.title}</h3></div><div class="sec-body">${body}</div>`;
    if (["Flight Information", "Hotel Suggestions", "Final Recommendations"].includes(s.title)) el.querySelectorAll(".prose > ul, .prose > ol").forEach((l) => l.children.length > 1 && l.classList.add("cards"));
    box.appendChild(el); io.observe(el); el.querySelectorAll(".rv").forEach((r) => io.observe(r));
    jump.insertAdjacentHTML("beforeend", `<a href="#s${i}">${ICONS[s.title] || "🌍"} ${s.title === "Full plan" ? "Plan" : s.title}</a>`);
  });
  $("resultSection").classList.remove("hidden"); setTimeout(() => document.querySelectorAll("#resultBox .rv:not(.on)").forEach((r) => r.classList.add("on")), 1200); $("resultSection").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
}
$("copyBtn").onclick = () => navigator.clipboard.writeText(latest).then(() => { $("copyBtn").textContent = "Copied"; setTimeout(() => $("copyBtn").textContent = "Copy", 1400); }).catch(() => showError("Could not copy the plan."));
$("pdfBtn").onclick = () => {
  if (!latest) return showError("Plan a trip first."); const b = $("pdfBtn"); b.disabled = true; b.textContent = "Preparing…";
  const h = document.createElement("div"); h.className = "prose"; h.style.cssText = "padding:24px;color:#111;background:#fff"; h.innerHTML = `<h1>Wanderwing: trip to ${place}</h1>` + render(latest);
  html2pdf().set({ margin: 0.5, filename: "wanderwing-plan.pdf", html2canvas: { scale: 2 }, jsPDF: { unit: "in", format: "a4" }, pagebreak: { mode: ["css", "legacy"] } }).from(h).save().catch(() => showError("Could not create the PDF.")).finally(() => { b.disabled = false; b.textContent = "Download PDF"; });
};

/* ---- Extra features ---- */
$("places").innerHTML = DEST.map((d) => `<option value="${d.n}">`).join("");
const STYLES = ["🏖️ Beaches", "🏛️ Culture", "🍜 Food", "🥾 Adventure", "👨‍👩‍👧 Family", "💑 Romantic", "🛍️ Shopping"];
$("styles").innerHTML = STYLES.map((t) => `<button type="button" aria-pressed="false">${t}</button>`).join("");
$("styles").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
  const picked = [...$("styles").querySelectorAll("[aria-pressed=true]")].map((x) => x.textContent.replace(/^\S+\s/, "")); $("notes").dataset.styles = picked.join(", "); };
const _submit = $("finder").onsubmit; // styles are appended to the prompt through the notes field
$("finder").addEventListener("submit", () => { const st = $("notes").dataset.styles; if (st && !$("notes").value.includes(st)) $("notes").value = ($("notes").value + " Interests: " + st + ".").trim(); }, true);
/* typewriter placeholder */
(function () { if (reduce) return; let i = 0, j = 0, del = false; const t = $("to"); setInterval(() => { if (document.activeElement === t || t.value) return; const w = DEST[i].n; j += del ? -1 : 1; t.placeholder = w.slice(0, j) || "Where to?"; if (j === w.length) del = true; if (j === 0 && del) { del = false; i = (i + 1) % DEST.length; } }, 110); })();
/* scroll: progress bar + parallax */
addEventListener("scroll", () => { const h = document.documentElement; $("progress").style.width = (h.scrollTop / (h.scrollHeight - innerHeight)) * 100 + "%"; if (!reduce) { document.querySelector(".hero").style.setProperty("--py", scrollY * 0.25 + "px"); const c = $("cta").getBoundingClientRect(); $("cta").style.setProperty("--py2", (innerHeight - c.top) * -0.08 + "px"); } }, { passive: true });
/* 3D tilt + glare on destination cards */
if (!reduce) $("destRow").addEventListener("pointermove", (e) => { const c = e.target.closest(".scene-wrap"); if (!c) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; c.style.transform = `perspective(700px) rotateY(${(x - .5) * 16}deg) rotateX(${(.5 - y) * 16}deg) translateY(-8px)`; c.style.setProperty("--gx", x * 100 + "%"); c.style.setProperty("--gy", y * 100 + "%"); });
$("destRow").addEventListener("pointerout", (e) => { const c = e.target.closest(".scene-wrap"); if (c) c.style.transform = ""; });
/* trip at a glance, counters */
function glance(data) {
  const days = +$("days").value || 5, items = [[days, "days"], [place || "—", "destination"], [$("from").value || "—", "flying from"], [$("budget").value || "Flexible", "budget"], [data.llm_calls, "agent steps"]];
  $("glance").innerHTML = items.map(([v, l], i) => `<div style="animation-delay:${i * .08}s"><b data-n="${typeof v === "number" ? v : ""}">${v}</b><small>${l}</small></div>`).join("");
  $("glance").querySelectorAll("b[data-n]").forEach((b) => { const n = +b.dataset.n; if (!n || reduce) return; let k = 0; const t = setInterval(() => { b.textContent = ++k; if (k >= n) clearInterval(t); }, 70); });
}
/* confetti */
function confetti() { if (reduce) return; for (let i = 0; i < 28; i++) { const s = document.createElement("span"); s.className = "confetti"; s.textContent = ["✈️", "🌴", "⭐", "🎈", "🌍"][i % 5]; s.style.left = Math.random() * 100 + "vw"; s.style.animationDelay = Math.random() * .8 + "s"; document.body.appendChild(s); setTimeout(() => s.remove(), 4000); } }
/* recent trips (saved in this browser) + share */
function saveRecent(data) { try { const list = JSON.parse(localStorage.getItem("ww_trips") || "[]").filter((t) => t.place !== place); list.unshift({ place, answer: data.answer, thread_id: data.thread_id, llm_calls: data.llm_calls, days: $("days").value, from: $("from").value, budget: $("budget").value }); localStorage.setItem("ww_trips", JSON.stringify(list.slice(0, 4))); drawRecent(); } catch (e) {} }
function drawRecent() { try { const list = JSON.parse(localStorage.getItem("ww_trips") || "[]"); $("recent").classList.toggle("hidden", !list.length); $("recent").innerHTML = list.length ? "Recent trips:" + list.map((t, i) => `<button type="button" data-i="${i}">${(byName(t.place) || { e: "🌍" }).e} ${t.place}</button>`).join("") : ""; } catch (e) {} }
$("recent").onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; const t = JSON.parse(localStorage.getItem("ww_trips"))[b.dataset.i]; place = t.place; $("days").value = t.days; $("from").value = t.from; $("budget").value = t.budget; showResult(t, false); };
drawRecent();
$("shareBtn").onclick = async () => { const text = `My ${place} trip plan from Wanderwing:\n\n${latest.slice(0, 1500)}`; try { if (navigator.share) await navigator.share({ title: `Trip to ${place}`, text }); else { await navigator.clipboard.writeText(text); $("shareBtn").textContent = "Copied"; setTimeout(() => $("shareBtn").textContent = "Share", 1400); } } catch (e) {} };