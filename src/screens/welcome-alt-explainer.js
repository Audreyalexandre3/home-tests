// A returning user's « Create a Playbook » (`isIntegrated()`): instead of the
// card filling with bars, each step of the run plays a scene that teaches what
// the Playbook is made of, how its parts connect, and what each one lets me do.
// The first-time run keeps its card (welcome-alt-shell.js renderCard).
//
// A scene is a fixed 560 × 440 drawing: HTML nodes placed in % (real text, DS
// glyphs) over one SVG layer of olive threads (pathLength="1", drawn by CSS).
// Motion lives in welcome-explainer.css: one play, then a quiet glint.
// The ready screen paints once and moves by attributes (`data-lit`, `is-done`)
// so its stages light the parts one by one without replaying the scene.

import { escapeHtml } from "../utils.js?v=2617";
import { isFlagOn } from "../feature-flags.js?v=2617";
import { networkIcon, networkLabel } from "../social-profiles.js?v=2617";
import { playbookNetworks } from "../voice-parts.js?v=2617";
import { RECAP_SECTIONS } from "../playbook-view.js?v=2617";
import { tint, domainOf } from "./welcome-alt-shell.js?v=2617";

const PART_IDS = ["goals", "voice", "brand", "competitors"];
const part = (id) => RECAP_SECTIONS.find((s) => s.id === id) || {};

// `x`, `y`: the node's centre in the 560 × 440 drawing; `d`: its entrance delay (s).
const node = (x, y, d, inner, cls = "", attrs = "") =>
  `<div class="wx-node ${cls}" ${attrs} style="left:${(x / 5.6).toFixed(2)}%;top:${(y / 4.4).toFixed(2)}%">
    <div class="wx-pop" style="--d:${d}s">${inner}</div>
  </div>`;

// A thread between two points, bowed horizontally; `cls` names it for the ready screen.
const thread = (x1, y1, x2, y2, d, attrs = "") => {
  const mx = (x1 + x2) / 2;
  const path = `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  return `<g class="wx-thread" ${attrs} style="--d:${d}s">
    <path class="wx-thread__line" d="${path}" pathLength="1" />
    <path class="wx-thread__glint" d="${path}" pathLength="1" />
  </g>`;
};

const glyph = (id) =>
  `<span class="welcome-flow__glyph is-icon is-tinted wx-glyph" style="${tint(id)}"><i class="${part(id).icon}"></i></span>`;

const partTile = (id, meaning, extra = "") =>
  `<div class="wx-card wx-part" style="${tint(id)}">
    ${glyph(id)}
    <span class="wx-part__text">
      <span class="wx-part__name">${escapeHtml(part(id).title || "")}</span>
      <span class="wx-part__meaning">${escapeHtml(meaning)}</span>
      ${extra}
    </span>
  </div>`;

// My stitch: what I do between what you give and what comes out.
const seam = (label) =>
  `<span class="wx-seam"><i class="ap-icon-sparkles" aria-hidden="true"></i>${escapeHtml(label)}</span>`;

const playbookChip = (d, sub) => {
  const name = d?.name && d.name !== "New Playbook" ? d.name : "Your Playbook";
  return `<div class="wx-card wx-playbook">
    <span class="wx-playbook__mark"><i class="ap-icon-buildings"></i></span>
    <span class="wx-part__text">
      <span class="wx-part__name">${escapeHtml(name)}</span>
      ${sub ? `<span class="wx-part__meaning">${escapeHtml(sub)}</span>` : ""}
    </span>
  </div>`;
};

const stage = (caption, body, svg, attrs = "") => `
  <div class="wx-caption">
    <h3 class="wx-caption__title">${escapeHtml(caption.title)}</h3>
    <p class="wx-caption__text">${escapeHtml(caption.text)}</p>
  </div>
  <div class="wx-stage" aria-hidden="true" ${attrs}>
    <svg class="wx-threads" viewBox="0 0 560 440" preserveAspectRatio="none">${svg}</svg>
    ${body}
  </div>`;

const brandColors = (d) => {
  const hexes = [...new Set((d?.brandColors || []).map((c) => c.hex).filter(Boolean))].slice(0, 3);
  return hexes.length >= 2 ? hexes : ["#2f6f5e", "#f2c14e", "#e86a33"];
};

const networks = (d) => {
  const nets = playbookNetworks(d).filter(Boolean);
  return (nets.length ? nets : ["linkedin", "instagram", "facebook"]).slice(0, 3);
};

// ── The scenes ─────────────────────────────────────────────────────────────

// Brand: a site goes in, a Playbook comes out, and it holds four parts.
function brandScene(d) {
  const domain = domainOf(d?.websiteUrl) || "yourbrand.com";
  const meanings = {
    goals: "Who you write for, and why",
    voice: "How you sound",
    brand: "Your colors, logo and type",
    competitors: "Who you keep an eye on",
  };
  const ys = [70, 170, 270, 370];
  const site = `<div class="wx-card wx-site">
    <span class="wx-site__bar"><i></i><i></i><i></i></span>
    <span class="wx-site__url">${escapeHtml(domain)}</span>
    <span class="wx-site__hero"></span>
    <span class="wx-site__line"></span>
    <span class="wx-site__line is-short"></span>
  </div>`;
  return stage(
    {
      title: "This is how I get to know your brand",
      text: "I read what you give me and sort it into four parts. Every post I write starts from them.",
    },
    node(82, 220, 0, site) +
      node(176, 290, 0.5, seam("I read it")) +
      node(260, 220, 0.8, playbookChip(d, domain), "is-hub") +
      PART_IDS.map((id, i) => node(465, ys[i], 1.5 + i * 0.18, partTile(id, meanings[id]))).join(""),
    thread(150, 220, 192, 220, 0.3) + PART_IDS.map((_, i) => thread(328, 220, 372, ys[i], 1.2 + i * 0.18)).join(""),
  );
}

// Language: every post comes out in the Playbook's language.
function languageScene(d) {
  const lang = d?.primaryLanguage || (d?.languages || [])[0] || "English";
  const post = (y, dly, text) =>
    node(
      410,
      y,
      dly,
      `<div class="wx-card wx-post is-line"><span class="wx-post__text wx-type" style="--d:${dly + 0.3}s">${escapeHtml(text)}</span></div>`,
    );
  return stage(
    {
      title: "Every post, in your language",
      text: `I write in ${lang} on every network, so nothing needs translating.`,
    },
    node(
      130,
      220,
      0,
      `${playbookChip(d, "Writes in")}<span class="wx-lang"><i class="ap-icon-translate"></i>${escapeHtml(lang)}</span>`,
      "is-hub",
    ) +
      post(120, 0.8, "Spring is here, and so is our new range.") +
      post(220, 1.1, "Three tips we wish we'd known sooner.") +
      post(320, 1.4, "Thank you for 10 years together."),
    thread(198, 220, 290, 120, 0.5) + thread(198, 220, 290, 220, 0.7) + thread(198, 220, 290, 320, 0.9),
  );
}

// Documents: a brand book sharpens the voice and the look.
function documentsScene(d) {
  const colors = brandColors(d);
  const doc = `<div class="wx-card wx-doc">
    <span class="wx-doc__head"><i class="ap-icon-file--pdf"></i>Brand book.pdf</span>
    <span class="wx-doc__line"></span>
    <span class="wx-doc__mark is-voice">"Warm, never pushy."</span>
    <span class="wx-doc__line is-short"></span>
    <span class="wx-doc__swatches">${colors.map((c) => `<i style="background:${escapeHtml(c)}"></i>`).join("")}</span>
  </div>`;
  const swatches = `<span class="wx-swatches">${colors.map((c, i) => `<i style="background:${escapeHtml(c)};--d:${2 + i * 0.12}s"></i>`).join("")}</span>`;
  return stage(
    {
      title: "Your brand book makes me sharper",
      text: "The words you use go to your Voice profile. Your colors and type go to Branding.",
    },
    node(120, 220, 0, doc) +
      node(120, 330, 0.6, seam("I read it page by page")) +
      node(440, 130, 1.2, partTile("voice", "Warm, never pushy")) +
      node(440, 310, 1.4, partTile("brand", "Your colors and type", swatches)),
    thread(196, 196, 348, 130, 0.5) + thread(196, 250, 348, 310, 0.7),
  );
}

// Voice source: learned once, then every network's post sounds like you.
function voiceScene(d) {
  const perNetwork = isFlagOn("voicePerNetwork");
  const sources = [
    ["ap-icon-post", "Your posts"],
    ["ap-icon-file", "A document"],
    ["ap-icon-single-chat-bubble", "Your answers"],
  ];
  const lines = [
    "Small steps, big results. Here's ours.",
    "Behind the scenes of a busy week.",
    "You asked, we listened.",
  ];
  const ys = [110, 220, 330];
  const traits = `<span class="wx-traits">${["Warm", "Clear", "Helpful"]
    .map((t, i) => `<span class="wx-trait" style="--d:${1.4 + i * 0.15}s">${t}</span>`)
    .join("")}</span>`;
  const nets = networks(d);
  return stage(
    {
      title: "Your voice, learned once, used everywhere",
      text: perNetwork
        ? "I learn how you sound from any of these. Each network follows that voice, or gets one of its own."
        : "I learn how you sound from any of these. Then every post sounds like you, on every network.",
    },
    sources
      .map(([icon, label], i) =>
        node(80, ys[i], i * 0.15, `<div class="wx-card wx-source"><i class="${icon}"></i>${label}</div>`),
      )
      .join("") +
      node(270, 220, 0.9, partTile("voice", "How you sound", traits), "is-hub") +
      nets
        .map((n, i) =>
          node(
            470,
            ys[i],
            2 + i * 0.18,
            `<div class="wx-card wx-post">
              <span class="wx-post__net" title="${escapeHtml(networkLabel(n))}"><i class="${networkIcon(n)}"></i></span>
              <span class="wx-post__text">${escapeHtml(lines[i])}</span>
              ${perNetwork && i === nets.length - 1 ? `<span class="wx-post__own">Its own voice</span>` : ""}
            </div>`,
          ),
        )
        .join(""),
    sources.map((_, i) => thread(140, ys[i], 186, 220, 0.4 + i * 0.12)).join("") +
      nets.map((_, i) => thread(354, 220, 390, ys[i], 1.8 + i * 0.18)).join(""),
  );
}

// Building, then ready: the four parts come together in one post.
function readyScene(d) {
  const name = d?.name && d.name !== "New Playbook" ? d.name : "Your brand";
  const colors = brandColors(d);
  const net = networks(d)[0];
  const corners = { goals: [96, 92], voice: [464, 92], brand: [96, 348], competitors: [464, 348] };
  const meanings = {
    goals: "Speaks to the right people",
    voice: "Sounds like you",
    brand: "Looks like your brand",
    competitors: "Says what they don't",
  };
  const ends = { goals: [196, 170], voice: [364, 170], brand: [196, 270], competitors: [364, 270] };
  const post = `<div class="wx-card wx-draft">
    <span class="wx-draft__head">
      <span class="wx-draft__avatar">${escapeHtml(name.slice(0, 1).toUpperCase())}</span>
      <span class="wx-draft__name">${escapeHtml(name)}</span>
      <i class="${networkIcon(net)} wx-draft__net"></i>
    </span>
    <span class="wx-draft__row" data-part="goals">For everyone starting out this spring:</span>
    <span class="wx-draft__row" data-part="voice">three small habits that changed everything for us.</span>
    <span class="wx-draft__img" data-part="brand" style="--c1:${escapeHtml(colors[0])};--c2:${escapeHtml(colors[1])};--c3:${escapeHtml(colors[2] || colors[0])}"></span>
    <span class="wx-draft__row is-angle" data-part="competitors">The one nobody else talks about is number three.</span>
    <span class="ap-status mermaid wx-draft__status">Ready to write</span>
  </div>`;
  const doors = `<div class="wx-doors">
    <span><i class="ap-icon-double-chat-bubbles"></i>Drafts in any chat</span>
    <span><i class="ap-icon-sparkles"></i>Ideas from Topics</span>
    <span><i class="ap-icon-image"></i>On-brand images</span>
  </div>`;
  return stage(
    {
      title: "Watch the parts work together",
      text: "Each part shapes the same post. Together, they make it yours.",
    },
    PART_IDS.map((id) => node(...corners[id], 0, partTile(id, meanings[id]), "wx-corner", `data-part="${id}"`)).join(
      "",
    ) +
      node(280, 220, 0.2, post, "is-hub") +
      node(280, 412, 0, doors, "wx-doors-node"),
    PART_IDS.map((id) => {
      const [x, y] = corners[id];
      const sx = x < 280 ? x + 86 : x - 86;
      return thread(sx, y, ...ends[id], 0, `data-part="${id}"`);
    }).join(""),
    `data-scene-ready data-lit="0"`,
  );
}

const SCENES = {
  url: brandScene,
  language: languageScene,
  documents: documentsScene,
  voiceFrom: voiceScene,
  recap: readyScene,
};

// Paint `el` for `step`: the scene once, then (ready screen) its lit parts.
export function paintExplainer(el, step, d, build) {
  if (el.dataset.step !== step) {
    el.dataset.step = step;
    el.innerHTML = (SCENES[step] || brandScene)(d);
  }
  const ready = el.querySelector("[data-scene-ready]");
  if (!ready) return;
  const stages = build?.stages?.length || 1;
  const done = Boolean(build?.done);
  const lit = done ? 4 : Math.min(4, Math.ceil((((build?.at ?? -1) + 1) / stages) * 4));
  ready.dataset.lit = String(lit);
  ready.classList.toggle("is-done", done);
  ready.querySelectorAll("[data-part]").forEach((p) => {
    p.classList.toggle("is-lit", PART_IDS.indexOf(p.dataset.part) < lit);
  });
}
