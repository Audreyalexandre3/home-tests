// A returning user's « Create a Playbook » (`isIntegrated()`): instead of the
// card filling with bars, each step of the run plays a scene that teaches what
// the Playbook is made of, how its parts connect, and what each one lets me do.
// The first-time run keeps its card (welcome-alt-shell.js renderCard).
//
// Every scene reads top to bottom, like the HOME-5 stage: what you give me (a
// real-looking object: your site, a brand book, your posts), my stitch (an olive
// thread and a butter pill saying what I do), then what it becomes, at reading
// size. Pieces of the source fly along curves (CSS offset-path) into the part
// they feed, so the link between them is seen, not told.
//
// One fixed 560 × 540 canvas, laid out in px, zoomed to fit the stage
// (`fit()`). Real data where the draft has it (name, logo, colours, traits,
// audience, competitors), a believable example otherwise.
// The ready screen paints once and moves by attributes (`is-lit`, `is-done`)
// so its stages light the parts one by one without replaying the scene.

import { escapeHtml } from "../utils.js?v=2636";
import { isFlagOn } from "../feature-flags.js?v=2636";
import { networkIcon, networkLabel } from "../social-profiles.js?v=2636";
import { playbookNetworks } from "../voice-parts.js?v=2636";
import { RECAP_SECTIONS } from "../playbook-view.js?v=2636";
import { tint, domainOf } from "./welcome-alt-shell.js?v=2636";

const W = 560;
const H = 540;
const PART_IDS = ["goals", "voice", "brand", "competitors"];
const part = (id) => RECAP_SECTIONS.find((s) => s.id === id) || {};
const e = escapeHtml;

// ── What the draft knows, or a believable example ─────────────────────────

function brandOf(d) {
  const domain = domainOf(d?.websiteUrl) || "yourbrand.com";
  const named = d?.name && d.name !== "New Playbook" ? d.name : "";
  const name = named || domain.split(".")[0].replace(/^./, (c) => c.toUpperCase());
  // The site's palette, else a calm example.
  const hexes = [...new Set((d?.brandColors || []).map((c) => (c.hex || "").toUpperCase()).filter(Boolean))].filter(
    (h) => h !== "#FFFFFF",
  );
  // Fewer than three: the site's own, lightened, rather than a stranger's palette.
  const mix = (pct) => `color-mix(in srgb, ${hexes[0]} ${pct}%, white)`;
  const colors = !hexes.length
    ? ["#1F6F5C", "#F2C14E", "#E8835A", "#2B3A55"]
    : [...hexes, mix(45), mix(20)].slice(0, Math.max(3, Math.min(4, hexes.length)));
  const traits = (d?.voiceProfile?.headline || "")
    .split(/\s*·\s*/)
    .filter(Boolean)
    .slice(0, 3)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1));
  const nets = playbookNetworks(d).filter((n) => n && n !== "tiktok" && n !== "youtube");
  return {
    domain,
    name,
    logo: d?.brandLogo || "",
    colors,
    font: d?.brandTypography?.headingFont || "Averta",
    traits: traits.length ? traits : ["Warm", "Clear", "Helpful"],
    voice: d?.voiceSummary || "Warm and clear. Every post opens with what matters to the reader.",
    audience: d?.audience?.[0] || "People who care about what they buy",
    competitors: (d?.competitors || [])
      .map((c) => c.name)
      .filter(Boolean)
      .slice(0, 2),
    networks: (nets.length ? nets : ["linkedin", "instagram", "facebook"]).slice(0, 3),
  };
}

// ── Pieces ────────────────────────────────────────────────────────────────

// An absolutely placed block on the canvas; `d`: its entrance delay (s).
const at = (x, y, w, inner, { cls = "", d = 0, attrs = "", style = "" } = {}) =>
  `<div class="wx-at ${cls}" ${attrs} style="left:${x}px;top:${y}px;width:${w}px;--d:${d}s;${style}">${inner}</div>`;

// A curve from (x1,y1) down to (x2,y2): leaves vertically, arrives vertically.
const curve = (x1, y1, x2, y2) => {
  const k = Math.max(24, (y2 - y1) * 0.55);
  return `M${x1} ${y1} C${x1} ${y1 + k}, ${x2} ${y2 - k}, ${x2} ${y2}`;
};

// A piece of the source travelling to where it lands.
const fly = (x1, y1, x2, y2, d, inner) =>
  `<div class="wx-fly" style="offset-path:path('${curve(x1, y1, x2, y2)}');--d:${d}s">${inner}</div>`;

// An olive thread, with a particle running it once it has drawn (hidden till
// then: a circle waiting for its motion sits at the canvas origin).
const thread = (x1, y1, x2, y2, d, attrs = "") => {
  const p = curve(x1, y1, x2, y2);
  return `<g class="wx-thread" ${attrs} style="--d:${d}s">
    <path class="wx-thread__line" d="${p}" pathLength="1" />
    <circle class="wx-particle" r="3" opacity="0">
      <set attributeName="opacity" to="1" begin="${(d + 0.8).toFixed(2)}s" />
      <animateMotion dur="2.2s" begin="${(d + 0.8).toFixed(2)}s" repeatCount="indefinite" path="${p}" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />
    </circle>
  </g>`;
};

// My stitch: the butter pill on the thread, saying what I do.
const seam = (y, label, d) =>
  at(0, y, W, `<span class="wx-seam"><i class="ap-icon-sparkles" aria-hidden="true"></i>${e(label)}</span>`, {
    cls: "wx-seam-row",
    d,
  });

const glyph = (id) =>
  `<span class="welcome-flow__glyph is-icon is-tinted wx-glyph" style="${tint(id)}"><i class="${part(id).icon}"></i></span>`;

const brandMark = (b, size = 28) =>
  b.logo
    ? `<img class="wx-mark" src="${e(b.logo)}" alt="" style="width:${size}px;height:${size}px" />`
    : `<span class="wx-mark is-initial" style="width:${size}px;height:${size}px;background:${e(b.colors[0])}">${e(b.name.slice(0, 1))}</span>`;

const swatches = (colors, cls = "") =>
  `<span class="wx-swatches ${cls}">${colors.map((c) => `<i style="background:${e(c)}"></i>`).join("")}</span>`;

const chips = (list, cls = "wx-chip") => list.map((t) => `<span class="${cls}">${e(t)}</span>`).join("");

const avatar = (b, net, size) => `
  <span class="ap-avatar size-${size} wx-post__avatar">
    ${b.logo ? `<img src="${e(b.logo)}" alt="" />` : `<span class="ap-avatar-initials">${e(b.name.slice(0, 1))}</span>`}
    <span class="ap-avatar-network" role="img" aria-label="${e(networkLabel(net))}"><i class="${networkIcon(net)}" aria-hidden="true"></i></span>
  </span>`;

// A post as the networks show it: the DS avatar with its network badge.
const post = (b, net, text, { tag = "", cls = "" } = {}) => `
  <article class="wx-post ${cls}">
    <header class="wx-post__head">${avatar(b, net, 32)}
      <span class="wx-post__who"><strong>${e(b.name)}</strong><span>Just now</span></span>
    </header>
    <p class="wx-post__text">${text}</p>
    ${tag}
  </article>`;

// `h`: the scene's own height on the canvas, so a short one isn't framed by empty space.
const stage = (caption, body, svg, attrs = "", h = H) => `
  <div class="wx-caption">
    <h3 class="wx-caption__title">${e(caption.title)}</h3>
    <p class="wx-caption__text">${e(caption.text)}</p>
  </div>
  <div class="wx-fit" data-h="${h}" style="--h:${h}px">
    <div class="wx-canvas" aria-hidden="true" ${attrs}>
      <svg class="wx-threads" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}">${svg}</svg>
      ${body}
    </div>
  </div>`;

const partCard = (id, meaning, body, slotDelay) => `
  <div class="wx-part" style="${tint(id)}">
    <div class="wx-part__head">${glyph(id)}<span><strong>${e(part(id).title)}</strong><span>${e(meaning)}</span></span></div>
    <div class="wx-slot" style="--d:${slotDelay.toFixed(2)}s">${body}</div>
  </div>`;

// Three posts dealt as a fan: the middle one readable, the sides behind it.
function fanPosts(b, textOf, { y, d, tagOf = () => "" }) {
  const nets = b.networks;
  const slots = [
    { x: 24, rot: -5, z: 1, cls: "is-side", net: nets[1] || nets[0] },
    { x: 180, rot: 0, z: 3, cls: "is-front", net: nets[0] },
    { x: 336, rot: 5, z: 2, cls: "is-side", net: nets[2] || nets[0] },
  ];
  return slots
    .map((s, i) =>
      at(s.x, y + (s.rot ? 16 : 0), 200, post(b, s.net, textOf(i), { tag: tagOf(i), cls: s.cls }), {
        cls: "wx-fan",
        d: d + (i === 1 ? 0 : 0.18),
        style: `z-index:${s.z};--rot:${s.rot}deg`,
      }),
    )
    .join("");
}
const fanThreads = (y1, y2, d) =>
  thread(280, y1, 124, y2 + 16, d) + thread(280, y1, 280, y2, d) + thread(280, y1, 436, y2 + 16, d);

// ── The scenes ─────────────────────────────────────────────────────────────

// Website: I read your site, and every piece of it goes to one of four parts.
function brandScene(d) {
  const b = brandOf(d);
  const site = `
    <div class="wx-browser">
      <div class="wx-browser__bar"><span class="wx-browser__dots"><i></i><i></i><i></i></span>
        <span class="wx-browser__url"><i class="ap-icon-web" aria-hidden="true"></i>${e(b.domain)}</span>
      </div>
      <div class="wx-browser__page">
        <div class="wx-browser__nav"><span class="wx-browser__brand">${brandMark(b, 20)}<strong>${e(b.name)}</strong></span><span>Shop</span><span>About</span><span>Journal</span></div>
        <div class="wx-browser__hero">
          <div class="wx-browser__copy">
            <span class="wx-browser__h">Made with care,<br />for every day.</span>
            <span class="wx-browser__sub">For people who care about what they buy.</span>
            <span class="wx-browser__cta" style="background:${e(b.colors[0])}">Shop now</span>
          </div>
          <span class="wx-browser__img" style="--c1:${e(b.colors[0])};--c2:${e(b.colors[1])};--c3:${e(b.colors[2])}"></span>
        </div>
        <span class="wx-scan"></span>
      </div>
    </div>`;
  const cards = [
    {
      id: "goals",
      x: 16,
      y: 278,
      meaning: "Who you write for, and why",
      body: `<span class="wx-slot__text">${e(b.audience)}</span>`,
    },
    { id: "voice", x: 288, y: 278, meaning: "How you sound", body: `<span class="wx-chips">${chips(b.traits)}</span>` },
    {
      id: "brand",
      x: 16,
      y: 410,
      meaning: "Your colors, logo and type",
      body: `${swatches(b.colors)}<span class="wx-font"><b>Aa</b>${e(b.font)}</span>`,
    },
    {
      id: "competitors",
      x: 288,
      y: 410,
      meaning: "Who you keep an eye on",
      body: b.competitors.length
        ? `<span class="wx-chips">${chips(b.competitors)}</span>`
        : `<span class="wx-slot__text">I suggest brands like yours</span>`,
    },
  ];
  // Where each piece leaves the site, and what it looks like on the way.
  const flights = [
    [
      190,
      128,
      144,
      334,
      2.0,
      `<span class="wx-chip is-fly"><i class="ap-icon-multiple-users"></i>Your audience</span>`,
    ],
    [190, 96, 416, 334, 2.25, `<span class="wx-chip is-fly"><i class="ap-icon-quote"></i>Your words</span>`],
    [400, 120, 144, 466, 2.5, swatches(b.colors.slice(0, 3), "is-fly")],
    [300, 16, 416, 466, 2.75, `<span class="wx-chip is-fly"><i class="ap-icon-search"></i>Brands like yours</span>`],
  ];
  return stage(
    {
      title: "This is how I get to know your brand",
      text: "I read your site and sort what I find into four parts. Every post I write starts from them.",
    },
    at(80, 0, 400, site, { cls: "wx-hero" }) +
      seam(222, "I sort it into four parts", 1.2) +
      cards
        .map((c, i) => at(c.x, c.y, 256, partCard(c.id, c.meaning, c.body, 2.9 + i * 0.25), { d: 1.5 + i * 0.1 }))
        .join("") +
      flights.map((f) => fly(...f)).join(""),
    thread(280, 206, 280, 262, 1) + thread(280, 262, 144, 278, 1.4) + thread(280, 262, 416, 278, 1.4),
  );
}

// Language: one Playbook, every post in its language.
function languageScene(d) {
  const b = brandOf(d);
  const lang = d?.primaryLanguage || (d?.languages || [])[0] || "English";
  const lines = [
    "Spring is here, and so is our new range.",
    "Three things we wish we'd known sooner.",
    "Ten years together. Thank you.",
  ];
  return stage(
    {
      title: "Every post, in your language",
      text: `I write in ${lang} on every network, so nothing needs translating.`,
    },
    at(
      150,
      30,
      260,
      `<div class="wx-langcard">${brandMark(b, 36)}<span><strong>${e(b.name)}</strong><span>Your Playbook</span></span>
        <span class="wx-lang"><i class="ap-icon-translate" aria-hidden="true"></i>${e(lang)}</span></div>`,
      { cls: "wx-hero" },
    ) +
      seam(160, `I write every post in ${lang}`, 0.6) +
      fanPosts(b, (i) => `<span class="wx-type" style="--d:${(1.6 + i * 0.35).toFixed(2)}s">${e(lines[i])}</span>`, {
        y: 250,
        d: 1.1,
      }),
    thread(280, 106, 280, 206, 0.4) + fanThreads(206, 250, 0.9),
    "",
    410,
  );
}

// Documents: your brand book sharpens the voice and the look.
function documentsScene(d) {
  const b = brandOf(d);
  const book = `
    <div class="wx-book">
      <div class="wx-book__page">
        <span class="wx-book__brand">${brandMark(b, 22)}<strong>${e(b.name)}</strong></span>
        <span class="wx-book__label">Our voice</span>
        <span class="wx-book__quote"><mark>Warm, never pushy.</mark> We talk like a friend who knows the product.</span>
        <span class="wx-book__label">We say</span>
        <span class="wx-book__say">"you", "made for", "every day"</span>
      </div>
      <div class="wx-book__page">
        <span class="wx-book__label">Colors</span>
        ${swatches(b.colors, "is-big")}
        <span class="wx-book__label">Type</span>
        <span class="wx-book__type"><b>Aa</b><span>${e(b.font)}<br />Headings and body</span></span>
      </div>
    </div>`;
  return stage(
    {
      title: "Your brand book makes me sharper",
      text: "The words you use go to your Voice profile. Your colors and type go to Branding.",
    },
    at(40, 0, 480, book, { cls: "wx-hero" }) +
      seam(262, "I keep your words and your look", 1.1) +
      at(
        24,
        340,
        240,
        partCard("voice", "How you sound", `<span class="wx-slot__text">Warm, never pushy</span>`, 2.6),
        {
          d: 1.4,
        },
      ) +
      at(
        296,
        340,
        240,
        partCard(
          "brand",
          "Your colors, logo and type",
          `${swatches(b.colors)}<span class="wx-font"><b>Aa</b>${e(b.font)}</span>`,
          2.9,
        ),
        { d: 1.55 },
      ) +
      fly(
        150,
        104,
        144,
        400,
        1.9,
        `<span class="wx-chip is-fly"><i class="ap-icon-quote"></i>Warm, never pushy</span>`,
      ) +
      fly(400, 76, 416, 400, 2.2, swatches(b.colors.slice(0, 3), "is-fly")),
    thread(280, 216, 280, 302, 0.9) + thread(280, 302, 144, 340, 1.2) + thread(280, 302, 416, 340, 1.2),
    "",
    460,
  );
}

// Voice source: learned once from what you give me, then every post sounds like you.
function voiceScene(d) {
  const b = brandOf(d);
  const perNetwork = isFlagOn("voicePerNetwork");
  const sources = [
    {
      icon: "ap-icon-post",
      title: "Your posts",
      body: `<span class="wx-mini"><i class="${networkIcon(b.networks[0])}"></i>Behind the scenes of a busy week.</span>
             <span class="wx-mini"><i class="${networkIcon(b.networks[1] || b.networks[0])}"></i>You asked, we listened.</span>`,
    },
    {
      icon: "ap-icon-file--pdf",
      title: "A document",
      body: `<span class="wx-mini is-doc">We say "you", never "users". Short sentences.</span>`,
    },
    {
      icon: "ap-icon-single-chat-bubble",
      title: "Your answers",
      body: `<span class="wx-bubble is-me">How do you sound?</span><span class="wx-bubble">Friendly, but expert.</span>`,
    },
  ];
  // The voice print: bars of a waveform, each breathing on its own beat.
  const bars = Array.from({ length: 36 }, (_, i) => {
    const h = 8 + Math.round(Math.abs(Math.sin(i * 0.9) * 22 + Math.sin(i * 0.37) * 12));
    return `<rect x="${i * 9}" y="${((46 - h) / 2).toFixed(1)}" width="5" height="${h}" rx="2.5" style="--i:${i}" />`;
  }).join("");
  const lines = [
    "Small steps, big results. Here's what changed for us this month.",
    "Three habits that give you back an hour a day. Number two surprised us.",
    "You asked, we listened. Here's what's new.",
  ];
  return stage(
    {
      title: "Your voice, learned once, used everywhere",
      text: perNetwork
        ? "I learn how you sound from any of these. Each network follows that voice, or gets one of its own."
        : "I learn how you sound from any of these. Then every post sounds like you, on every network.",
    },
    sources
      .map((s, i) =>
        at(
          8 + i * 186,
          0,
          172,
          `<div class="wx-source"><span class="wx-source__head"><i class="${s.icon}"></i>${s.title}</span>${s.body}</div>`,
          { cls: "wx-hero", d: i * 0.12 },
        ),
      )
      .join("") +
      seam(108, "I learn how you sound", 0.7) +
      at(
        100,
        150,
        360,
        `<div class="wx-print" style="${tint("voice")}">
          <div class="wx-print__head">${glyph("voice")}<strong>Voice profile</strong><span class="wx-chips">${b.traits
            .map((t, i) => `<span class="wx-chip is-tinted" style="--d:${(1.6 + i * 0.15).toFixed(2)}s">${e(t)}</span>`)
            .join("")}</span></div>
          <svg class="wx-wave" viewBox="0 0 320 46" width="320" height="46">${bars}</svg>
          <p class="wx-print__quote">${e(b.voice)}</p>
        </div>`,
        { cls: "wx-hero", d: 1.1 },
      ) +
      fanPosts(b, (i) => e(lines[i]), {
        y: 350,
        d: 2.2,
        tagOf: (i) =>
          perNetwork && i === 2
            ? `<span class="wx-tag is-own">Its own voice</span>`
            : `<span class="wx-tag"><i class="ap-icon-quote"></i>Your voice</span>`,
      }),
    [92, 280, 468].map((x) => thread(x, 92, 280, 150, 0.4)).join("") + fanThreads(318, 350, 2),
  );
}

// Building, then ready: four parts, one post. Each stage lights a part, its
// thread draws, and its share of the post is marked on the post itself.
function readyScene(d) {
  const b = brandOf(d);
  const net = b.networks[0];
  const pin = (id) => `<span class="wx-pin" style="${tint(id)}"><i class="${part(id).icon}"></i></span>`;
  const mark = (id, text) => `<span class="wx-hl" data-part="${id}" style="${tint(id)}">${pin(id)}${text}</span>`;
  const chipsRow = PART_IDS.map((id, i) =>
    at(
      i * 142,
      0,
      134,
      `<div class="wx-partchip" style="${tint(id)}">${glyph(id)}<strong>${e(part(id).title)}</strong></div>`,
      { cls: "wx-corner", attrs: `data-part="${id}"` },
    ),
  ).join("");
  const draft = `
    <article class="wx-draft">
      <header class="wx-post__head">${avatar(b, net, 40)}
        <span class="wx-post__who"><strong>${e(b.name)}</strong><span>Draft for ${e(networkLabel(net))}</span></span>
        <span class="ap-status mermaid wx-draft__status">Ready to write</span>
      </header>
      <p class="wx-draft__text">
        ${mark("goals", "If you run a growing team,")}
        ${mark("voice", "here's the one habit that gave us back four hours a week.")}
      </p>
      <div class="wx-draft__img wx-hl is-block" data-part="brand" style="${tint("brand")};--c1:${e(b.colors[0])};--c2:${e(b.colors[1])};--c3:${e(b.colors[2])}">
        ${pin("brand")}
        <span class="wx-draft__logo">${brandMark(b, 26)}</span>
      </div>
      <p class="wx-draft__text">${mark("competitors", "Nobody else in our space is talking about it yet.")}</p>
    </article>`;
  const doors = `<div class="wx-doors">
    <span><i class="ap-icon-double-chat-bubbles"></i>Drafts in any chat</span>
    <span><i class="ap-icon-sparkles"></i>Ideas from Topics</span>
    <span><i class="ap-icon-image"></i>On-brand images</span>
  </div>`;
  // Where each part's thread lands on the post.
  const ends = [
    [170, 120],
    [250, 120],
    [330, 120],
    [410, 120],
  ];
  return stage(
    {
      title: "Watch the parts work together",
      text: "Each part shapes the same post. Together, they make it sound and look like you.",
    },
    chipsRow + at(100, 120, 360, draft, { cls: "wx-hero" }) + at(0, 478, W, doors, { cls: "wx-doors-row" }),
    PART_IDS.map((id, i) => thread(67 + i * 142, 48, ...ends[i], 0, `data-part="${id}"`)).join(""),
    `data-scene-ready`,
  );
}

const SCENES = {
  url: brandScene,
  language: languageScene,
  documents: documentsScene,
  voiceFrom: voiceScene,
  recap: readyScene,
};

// Zoom the canvas to the stage: as wide as it allows, never taller than it.
function fit(el) {
  const stageEl = el.parentElement;
  const fitEl = el.querySelector(".wx-fit");
  if (!stageEl || !fitEl) return;
  const caption = el.querySelector(".wx-caption")?.offsetHeight || 0;
  const h = Number(fitEl.dataset.h) || H;
  const s = Math.min(1.2, (stageEl.clientWidth - 64) / W, (stageEl.clientHeight - caption - 96) / h);
  fitEl.style.setProperty("--s", String(Math.max(0.5, s)));
}

// Paint `el` for `step`: the scene once, then (ready screen) its lit parts.
export function paintExplainer(el, step, d, build) {
  if (el.dataset.step !== step) {
    el.dataset.step = step;
    el.innerHTML = (SCENES[step] || brandScene)(d);
    if (!el._wxFit) {
      el._wxFit = new ResizeObserver(() => fit(el));
      el._wxFit.observe(el.parentElement);
    }
    fit(el);
  }
  const ready = el.querySelector("[data-scene-ready]");
  if (!ready) return;
  const stages = build?.stages?.length || 1;
  const done = Boolean(build?.done);
  const lit = done ? 4 : Math.min(4, Math.ceil((((build?.at ?? -1) + 1) / stages) * 4));
  ready.classList.toggle("is-done", done);
  ready.querySelectorAll("[data-part]").forEach((p) => {
    p.classList.toggle("is-lit", PART_IDS.indexOf(p.dataset.part) < lit);
  });
}
