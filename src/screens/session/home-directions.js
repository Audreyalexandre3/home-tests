// A new chat's home, five directions (2026-11-02), each behind its own flag so
// they can be compared in the running app. Asked: « la home page permette …
// de comprendre ce qui existe dans le produit … et de rapidement commencer à
// travailler », then five solutions from what Mobbin shows AI tools doing.
//
//   homeOneInput   1 · one input that takes anything, the starting points beside it (Descript)
//   homeModes      2 · four modes fused to the input, each with its own panel (Gamma)
//   homeGallery    3 · a gallery of outcomes, each tile a door (VEED)
//   homePicks      4 · four posts I can write today, from your own material (Obvious)
//   homeShowcase   5 · what you give on the left, the before / after on a stage (Runway)
//
// The first flag ON in that order wins; all OFF = the hero as before.
//
// Every door is an EXISTING hook, so session.js runs the flow it always ran:
// `data-starter*` (batch / clips / top posts), `data-topic-use` / `-read`,
// `data-add-source`. The composer is the real one, passed in. What is local to a
// direction — switching a mode, the stage, a clip playing on hover — lives in
// <archie-home>, which wires itself (the same way <archie-pixels> does), so
// session.js gains no listener.
//
// The media is the product's own: the seeded podcast, cropped to each speaker
// the way the Clips space frames it; the top posts with their images and score;
// the Topic Feed's fresh Topics.

import { isFlagOn } from "../../feature-flags.js?v=2594";
import { chatStarters } from "../../mocks.js?v=2594";
import { getVideos, exampleVideo } from "../../videos-store.js?v=2594";
import { getTopPosts } from "../../top-posts-store.js?v=2594";
import { getFeedForPlaybook } from "../../topic-feeds-store.js?v=2594";
import { getFreshTopics, countFresh } from "../../topics-store.js?v=2594";
import { findTopicSource } from "../../topics-catalog.js?v=2594";
import { getContextById } from "../../contexts-store.js?v=2594";
import { voicesToFinish } from "../../voice-parts.js?v=2594";
import { networkLabel, networkIcon } from "../../social-profiles.js?v=2594";
import { isWorkspaceMode } from "../../active-playbook.js?v=2594";
import { escapeHtml } from "../../utils.js?v=2594";
import "../../archie-pixels.js?v=2594";

const DIRECTIONS = [
  ["homeOneInput", oneInput],
  ["homeModes", modes],
  ["homeGallery", gallery],
  ["homePicks", picks],
  ["homeShowcase", showcase],
];

/** The render function of the direction whose flag is ON, or null. */
export function activeHomeDirection() {
  const hit = DIRECTIONS.find(([flag]) => isFlagOn(flag));
  return hit ? hit[1] : null;
}

// ── Shared pieces ───────────────────────────────────────────────────────────

const esc = escapeHtml;

const WORDMARK = `
  <span class="nch__mark" role="img" aria-label="Archie">
    <img src="assets/logos/archie-wordmark.svg" alt="" />
  </span>`;

// The hooks session.js reads to run a workflow starter, by its action.
function starterAttrs(action) {
  const s = chatStarters.find((x) => x.action === action);
  if (!s) return "";
  const prompt = (s.prompt || "")
    .replace(/\{\{source\}\}/g, "your source")
    .replace(/\{\{video-source\}\}/g, "your video");
  return `data-starter="${s.id}" data-starter-action="${action}" data-starter-prompt="${esc(prompt)}"`;
}

// What each starting point is, in one place: the tone of its tile, its icon,
// what it does in one line, and what the composer says while it is chosen.
const KINDS = {
  source: {
    tone: "src",
    icon: "ap-icon-file--text",
    name: "A doc or a link",
    does: "I find the ideas, then draft the posts",
    hint: "Paste a link or drop a file. I'll find the ideas and draft the posts.",
    door: () => starterAttrs("open-batch"),
  },
  video: {
    tone: "clip",
    icon: "ap-icon-video",
    name: "A video",
    does: "I cut it into vertical clips",
    hint: "Drop a video or paste a YouTube link. I'll cut it into clips.",
    door: () => starterAttrs("open-video-clips"),
  },
  top: {
    tone: "top",
    icon: "ap-icon-line-graph",
    name: "A post that worked",
    does: "I write new ones on its pattern",
    hint: "Tell me which post did well, or let me show you your best ones.",
    door: () => `data-add-source="top-posts"`,
  },
  topic: {
    tone: "topic",
    icon: "ap-icon-megaphone",
    name: "A Topic",
    does: "I give you your take on it",
    hint: "Pick a Topic from this week, or tell me what to react to.",
    door: () => `data-add-source="topic"`,
  },
};

const tile = (k, size = "") => `
  <span class="nch-tile nch-tone--${KINDS[k].tone}${size ? ` nch-tile--${size}` : ""}" aria-hidden="true">
    <i class="${KINDS[k].icon}"></i>
  </span>`;

// The seeded podcast (or the Clips space's example for a new user), and three
// of its clips. Each speaker is framed the way the Clips space frames them: the
// left or the right half of the dual stack, cropped to 9:16.
function footage(session) {
  const v = getVideos(session?.contextId)[0] || getVideos()[0] || exampleVideo();
  const clips = (v.clips || []).slice(0, 3);
  return { video: v, clips };
}

// A 16:9 source cropped to 9:16 shows 31.6% of its width; object-position puts
// that window on the speaker's centre (25% or 75% of the frame).
const SPEAKER = ["13%", "87%"];

function clipMedia(video, clip, i, { autoplay = false } = {}) {
  const t = `#t=${(clip.startMs / 1000).toFixed(1)},${(clip.endMs / 1000).toFixed(1)}`;
  return `
    <span class="nch-clip" data-nch-play>
      <video class="nch-clip__video" src="${esc(video.url)}${t}" muted playsinline loop preload="metadata"
        ${autoplay ? "data-nch-autoplay" : ""} style="object-position:${SPEAKER[i % 2]} 50%" aria-hidden="true"></video>
      <span class="nch-clip__len">${Math.round((clip.endMs - clip.startMs) / 1000)}s</span>
    </span>`;
}

function videoMedia(video) {
  const t = `#t=${((video.posterMs || 0) / 1000).toFixed(1)}`;
  const min = Math.round((video.durationMs || 0) / 60000);
  return `
    <span class="nch-video" data-nch-play>
      <video class="nch-video__media" src="${esc(video.url)}${t}" muted playsinline preload="metadata" aria-hidden="true"></video>
      ${min ? `<span class="nch-clip__len">${min} min</span>` : ""}
    </span>`;
}

function topPostMini(p, { withImage = true } = {}) {
  return `
    <span class="nch-post">
      <span class="nch-post__head"><i class="${networkIcon(p.network)}" aria-hidden="true"></i><span>${esc(networkLabel(p.network))}, ${esc(p.publishedAt || "")}</span></span>
      <span class="nch-post__text">${esc(p.excerpt)}</span>
      ${withImage && p.image ? `<img class="nch-post__img" src="${esc(p.image)}" alt="" loading="lazy" />` : ""}
      <span class="nch-score">${p.vsAvg}× your average engagement</span>
    </span>`;
}

function topicMini(t) {
  const src = findTopicSource(t.sourceId);
  return `
    <span class="nch-topic">
      <span class="nch-topic__meta">${src ? `<i class="${src.icon}" aria-hidden="true"></i><span>${esc(src.name)}</span>` : ""}${t.isTrending ? `<span class="nch-trend">Trending</span>` : ""}</span>
      <span class="nch-topic__title">${esc(t.headline || t.title || "")}</span>
    </span>`;
}

function freshTopics(session, n = 3) {
  const feed = session?.contextId ? getFeedForPlaybook(session.contextId) : null;
  if (!feed) return { topics: [], total: 0, href: "#/topics" };
  const href = isWorkspaceMode() ? "#/topics" : `#/topics?pb=${encodeURIComponent(session.contextId)}`;
  return { topics: getFreshTopics(feed.id).slice(0, n), total: countFresh(feed.id), href };
}

const bestPosts = (n) =>
  getTopPosts()
    .slice()
    .sort((a, b) => (b.vsAvg || 0) - (a.vsAvg || 0))
    .slice(0, n);

// A draft-ish preview: three posts as stacked network cards with a few lines.
const draftStack = (nets = ["linkedin", "x", "instagram"]) => `
  <span class="nch-drafts" aria-hidden="true">${nets
    .map(
      (n) => `
    <span class="nch-draft"><i class="${networkIcon(n)}"></i><span class="nch-line" style="width:92%"></span><span class="nch-line" style="width:74%"></span><span class="nch-line" style="width:56%"></span></span>`,
    )
    .join("")}</span>`;

function shell(variant, body) {
  return `
    <archie-home class="empty-chat empty-chat--rows nch nch--${variant}" data-empty-chat>
      ${body}
    </archie-home>`;
}

// The real composer with the brand's pixel halo behind it, as on today's hero.
const lead = (composer) => `
  <div class="empty-chat__lead nch__lead">
    <archie-pixels class="empty-chat__pixels" data-quiet data-ripple aria-hidden="true"></archie-pixels>
    ${composer}
  </div>`;

// ── 1 · One input, the starting points beside it ────────────────────────────
// The box takes a file, a video, a link or a sentence. The four chips are the
// starting points; hovering one says in the box what it will do, a click starts
// it. Under them, three things a newcomer would not guess, each shown working.
function oneInput({ composer, session }) {
  const { video, clips } = footage(session);
  const chip = (k) => `
    <button type="button" class="nch-chip" ${KINDS[k].door()} data-nch-hint="${esc(KINDS[k].hint)}">
      ${tile(k, "sm")}<span>${esc(KINDS[k].name)}</span>
    </button>`;
  const ctx = session?.contextId ? getContextById(session.contextId) : null;
  const voices = voicesToFinish(ctx);
  const topic = freshTopics(session, 1).topics[0];
  return shell(
    "one",
    `
    ${WORDMARK}
    <h1 class="nch__title">What are we posting today?</h1>
    ${lead(composer)}
    <div class="nch-chips" role="group" aria-label="Start from">${["source", "video", "top", "topic"].map(chip).join("")}</div>
    <section class="nch-can" aria-labelledby="nchCan">
      <h2 class="nch__h" id="nchCan">What else I can do</h2>
      <div class="nch-can__grid">
        <button type="button" class="nch-can__card" ${KINDS.video.door()}>
          <span class="nch-can__vis nch-can__vis--well">${clips
            .slice(0, 2)
            .map((c, i) => clipMedia(video, c, i))
            .join("")}</span>
          <span class="nch-can__say"><span class="nch-can__name">Clips from one video</span><span class="nch-can__line">One podcast, ${video.clips.length} vertical clips with subtitles.</span></span>
        </button>
        <a class="nch-can__card" href="#/topics">
          <span class="nch-can__vis">${topic ? topicMini(topic) : draftStack()}</span>
          <span class="nch-can__say"><span class="nch-can__name">What your market talks about</span><span class="nch-can__line">I follow your competitors and bring back the week's Topics.</span></span>
        </a>
        <button type="button" class="nch-can__card" ${ctx ? `data-open-playbook="${ctx.id}"` : ""}>
          <span class="nch-can__vis">
            <span class="nch-voices">${["linkedin", "x", "instagram"]
              .map(
                (n) =>
                  `<span class="nch-voice"><i class="${networkIcon(n)}" aria-hidden="true"></i><span>${voices.includes(n) ? "Default voice" : "Its own voice"}</span></span>`,
              )
              .join("")}</span>
          </span>
          <span class="nch-can__say"><span class="nch-can__name">A voice for each network</span><span class="nch-can__line">LinkedIn and X don't sound the same. Your drafts won't either.</span></span>
        </button>
      </div>
    </section>`,
  );
}

// ── 2 · Modes fused to the input ────────────────────────────────────────────
// Four tabs sit on the composer's top edge like folder tabs. A mode changes what
// the box asks for and what lies under it: your files to start from, your
// videos, your best posts, this week's Topics. Each item is a door.
function modes({ composer, session }) {
  const { video, clips } = footage(session);
  const posts = bestPosts(3);
  const { topics, total, href } = freshTopics(session, 3);
  const tab = (k, i) => `
    <button type="button" class="ap-tabs-tab nch-mode${i === 0 ? " active" : ""}" role="tab" id="nchMode-${k}" aria-controls="nchPane-${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-nch-mode="${k}" data-nch-hint="${esc(KINDS[k].hint)}">
      <i class="${KINDS[k].icon}" aria-hidden="true"></i><span>${esc(KINDS[k].name)}</span>
    </button>`;
  const pane = (k, i, head, items, more = "") => `
    <section class="nch-pane" role="tabpanel" id="nchPane-${k}" aria-labelledby="nchMode-${k}" ${i ? "hidden" : ""} data-nch-pane="${k}">
      <header class="nch-pane__head"><p class="nch-pane__lede">${head}</p>${more}</header>
      <div class="nch-pane__grid">${items}</div>
    </section>`;
  const tryReq = (text, vis) => `
    <button type="button" class="nch-item" data-nch-fill="${esc(text)}">
      <span class="nch-item__vis">${vis}</span><span class="nch-item__name">${esc(text)}</span>
    </button>`;

  const panes = [
    pane(
      "source",
      0,
      "Try one of these, or paste your own link.",
      tryReq("Turn our offsite notes into a week of posts", draftStack()) +
        tryReq("3 LinkedIn posts from our latest blog article", draftStack(["linkedin", "linkedin", "linkedin"])) +
        tryReq("A thread for X from the keynote slides", draftStack(["x", "x", "x"])),
      `<button type="button" class="ap-button stroked grey" ${KINDS.source.door()}><i class="ap-icon-plus"></i><span>Add a file or a link</span></button>`,
    ),
    pane(
      "video",
      1,
      `${esc(video.name.replace(/\.mp4$/, ""))}: ${video.clips.length} clips ready to cut.`,
      clips
        .map(
          (c, i) => `
        <button type="button" class="nch-item nch-item--clip" ${KINDS.video.door()}>
          <span class="nch-item__vis nch-item__vis--well">${clipMedia(video, c, i)}</span><span class="nch-item__name">${esc(c.title)}</span>
        </button>`,
        )
        .join(""),
      `<button type="button" class="ap-button stroked grey" ${KINDS.video.door()}><i class="ap-icon-upload"></i><span>Add a video</span></button>`,
    ),
    pane(
      "top",
      2,
      "Your best posts this quarter. Pick one and I'll write new ones on its pattern.",
      posts.length
        ? posts
            .map((p) => `<button type="button" class="nch-item" ${KINDS.top.door()}>${topPostMini(p)}</button>`)
            .join("")
        : `<p class="nch-empty">Connect an account and your best posts show up here.</p>`,
    ),
    pane(
      "topic",
      3,
      topics.length ? `${topics.length} of ${total} Topics from this week's listening.` : "Nothing new this week.",
      topics
        .map(
          (t) => `
        <button type="button" class="nch-item" data-topic-use="${esc(t.id)}">${topicMini(t)}<span class="nch-item__go">Use in chat</span></button>`,
        )
        .join(""),
      `<a class="ap-link standalone small" href="${href}">Open Topic Feed<i class="ap-icon-arrow-right" aria-hidden="true"></i></a>`,
    ),
  ].join("");

  return shell(
    "modes",
    `
    ${WORDMARK}
    <h1 class="nch__title">What are we starting from?</h1>
    <div class="nch-modes">
      <div class="ap-tabs nch-modes__tabs"><div class="ap-tabs-nav" role="tablist" aria-label="Start from">${["source", "video", "top", "topic"].map(tab).join("")}</div></div>
      ${lead(composer)}
    </div>
    ${panes}`,
  );
}

// ── 3 · A gallery of outcomes ───────────────────────────────────────────────
// Six tiles, each a picture of what comes back, each a door into its flow. The
// composer stays below for anything the tiles don't cover.
function gallery({ composer, session }) {
  const { video, clips } = footage(session);
  const post = bestPosts(1)[0];
  const topic = freshTopics(session, 1).topics[0];
  const ctx = session?.contextId ? getContextById(session.contextId) : null;
  const t = (attrs, vis, name, line, mod = "") => `
    <button type="button" class="nch-tile-card${mod}" ${attrs}>
      <span class="nch-tile-card__vis">${vis}</span>
      <span class="nch-tile-card__say"><span class="nch-tile-card__name">${name}</span><span class="nch-tile-card__line">${line}</span></span>
    </button>`;
  const tiles = [
    t(
      KINDS.source.door(),
      `<span class="nch-flow"><span class="nch-file"><i class="ap-icon-file--pdf" aria-hidden="true"></i><span>notes.pdf</span></span><i class="ap-icon-arrow-right nch-flow__arrow" aria-hidden="true"></i>${draftStack()}</span>`,
      "Posts from a doc or a link",
      "The ideas first, then a draft for each network",
    ),
    t(
      KINDS.video.door(),
      clips.map((c, i) => clipMedia(video, c, i)).join(""),
      "Clips from a video",
      "Vertical, framed on the speaker, with subtitles",
      " nch-tile-card--well",
    ),
    post
      ? t(
          KINDS.top.door(),
          topPostMini(post, { withImage: false }),
          "New posts from a top post",
          "Same pattern, a new angle",
        )
      : "",
    topic
      ? t(
          `data-topic-use="${esc(topic.id)}"`,
          topicMini(topic),
          "Your take on a Topic",
          "What your market talks about this week",
        )
      : "",
    t(
      ctx ? `data-open-playbook="${ctx.id}"` : "",
      `<span class="nch-brand"><span class="nch-brand__img nch-brand__img--a">Listen first, launch second</span><span class="nch-brand__img nch-brand__img--b">18% more activation</span></span>`,
      "Images in your brand",
      "Your colours and fonts, made with each draft",
    ),
    t(
      KINDS.source.door(),
      `<span class="nch-week" aria-hidden="true">${["Mon", "Tue", "Wed", "Thu", "Fri"]
        .map((d, i) => `<span class="nch-week__day${i % 2 ? "" : " is-on"}"><small>${d}</small><i></i></span>`)
        .join("")}</span>`,
      "A week of posts",
      "Planned around a launch or an event",
    ),
  ].join("");
  return shell(
    "gallery",
    `
    ${WORDMARK}
    <h1 class="nch__title">What do you want to make?</h1>
    <div class="nch-gallery" role="group" aria-label="What I can make">${tiles}</div>
    ${lead(composer)}`,
  );
}

// ── 4 · Four posts I can write today ────────────────────────────────────────
// Archie starts: four posts it can already write from what the Playbook has,
// one per feature, so the product is learnt by using it. Built on the Topic
// Feed and the user's own material only.
function picks({ composer, session }) {
  const { video, clips } = footage(session);
  const post = bestPosts(1)[0];
  const topic = freshTopics(session, 1).topics[0];
  const ctx = session?.contextId ? getContextById(session.contextId) : null;
  const voices = voicesToFinish(ctx);
  const card = (k, from, vis, title, verb, attrs) => `
    <button type="button" class="nch-pick" ${attrs}>
      <span class="nch-pick__from">${tile(k, "sm")}<span>${from}</span></span>
      <span class="nch-pick__vis">${vis}</span>
      <span class="nch-pick__title">${title}</span>
      <span class="nch-pick__verb">${verb}<i class="ap-icon-arrow-right" aria-hidden="true"></i></span>
    </button>`;
  const cards = [
    clips[0] &&
      card(
        "video",
        "From your podcast",
        `<span class="nch-pick__well">${clips
          .slice(0, 2)
          .map((c, i) => clipMedia(video, c, i))
          .join("")}</span>`,
        `${clips.length} clips, starting with “${esc(clips[0].title)}”`,
        "Get the clips",
        KINDS.video.door(),
      ),
    post &&
      card(
        "top",
        "From your best post",
        topPostMini(post, { withImage: false }),
        "A follow-up on the same pattern",
        "Draft it",
        KINDS.top.door(),
      ),
    topic &&
      card(
        "topic",
        "Trending this week",
        topicMini(topic),
        "Your take on it, in your voice",
        "Draft it",
        `data-topic-use="${esc(topic.id)}"`,
      ),
    card(
      "source",
      "From a doc or a link",
      `<span class="nch-flow"><span class="nch-file"><i class="ap-icon-file--pdf" aria-hidden="true"></i><span>notes.pdf</span></span><i class="ap-icon-arrow-right nch-flow__arrow" aria-hidden="true"></i>${draftStack()}</span>`,
      "A week of posts from your notes",
      "Add a file",
      KINDS.source.door(),
    ),
  ]
    .filter(Boolean)
    .slice(0, 4)
    .join("");
  const voiceLine = voices.length
    ? `<p class="nch-picks__note"><i class="ap-icon-quote" aria-hidden="true"></i>${esc(networkLabel(voices[0]))} still uses your default voice. <button type="button" class="ap-link" data-finish-voices="${ctx.id}" data-finish-voices-net="${voices[0]}">Add its voice</button></p>`
    : "";
  return shell(
    "picks",
    `
    ${WORDMARK}
    <h1 class="nch__title">Posts I can write for you today</h1>
    <p class="nch__sub">From your videos, your best posts and this week's Topics. Pick one, or start your own.</p>
    <div class="nch-picks" role="group" aria-label="Ready to write">${cards}</div>
    ${voiceLine}
    ${lead(composer)}`,
  );
}

// ── 5 · Show and do ─────────────────────────────────────────────────────────
// Left: what you can give me, and the box. Right: a stage that plays each before
// and after in turn. Choosing a row holds the stage on it and sets the box.
function showcase({ composer, session }) {
  const { video, clips } = footage(session);
  const post = bestPosts(1)[0];
  const topic = freshTopics(session, 1).topics[0];
  const order = ["video", "source", "top", "topic"].filter((k) => (k === "top" ? post : k === "topic" ? topic : true));
  const row = (k, i) => `
    <button type="button" class="nch-row" role="tab" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-nch-slide-to="${i}" data-nch-hint="${esc(KINDS[k].hint)}">
      ${tile(k)}<span class="nch-row__text"><span class="nch-row__name">${esc(KINDS[k].name)}</span><span class="nch-row__does">${esc(KINDS[k].does)}</span></span>
      <span class="nch-row__bar" aria-hidden="true"></span>
    </button>`;
  const slides = {
    video: `
      <div class="nch-slide__in">${videoMedia(video)}</div>
      <div class="nch-slide__out nch-slide__out--clips">${clips.map((c, i) => clipMedia(video, c, i, { autoplay: true })).join("")}</div>
      <p class="nch-slide__cap">One podcast, ${video.clips.length} clips</p>`,
    source: `
      <div class="nch-slide__in"><span class="nch-file nch-file--lg"><i class="ap-icon-file--pdf" aria-hidden="true"></i><span>q2-strategy-offsite-notes.pdf</span></span></div>
      <div class="nch-slide__out">${draftStack()}</div>
      <p class="nch-slide__cap">9 ideas, a draft for each network</p>`,
    top: post
      ? `
      <div class="nch-slide__in">${topPostMini(post, { withImage: false })}</div>
      <div class="nch-slide__out">${draftStack(["linkedin", "linkedin", "x"])}</div>
      <p class="nch-slide__cap">New posts on the same pattern</p>`
      : "",
    topic: topic
      ? `
      <div class="nch-slide__in">${topicMini(topic)}</div>
      <div class="nch-slide__out">${draftStack(["linkedin"])}</div>
      <p class="nch-slide__cap">Your take, in your voice</p>`
      : "",
  };
  return shell(
    "show",
    `
    <div class="nch-split">
      <div class="nch-split__do">
        ${WORDMARK}
        <h1 class="nch__title">Give me anything. I'll turn it into posts.</h1>
        <div class="nch-rows" role="tablist" aria-label="What you can give me">${order.map(row).join("")}</div>
        ${lead(composer)}
      </div>
      <div class="nch-stage" data-nch-stage aria-live="polite">
        ${order
          .map(
            (k, i) => `
          <section class="nch-slide nch-slide--${k}${i === 0 ? " is-on" : ""}" role="tabpanel" data-nch-slide="${i}" ${i ? 'aria-hidden="true"' : ""}>
            ${slides[k]}
            <button type="button" class="ap-button primary orange nch-slide__go" ${KINDS[k].door()} ${i ? "tabindex=-1" : ""}><i class="ap-icon-sparkles" aria-hidden="true"></i><span>Try it</span></button>
          </section>`,
          )
          .join("")}
      </div>
    </div>`,
  );
}

// ── <archie-home>: the directions' local behaviour ──────────────────────────
// No state outside the element but the mode / slide it shows, kept across the
// re-renders session.js does while the chat is empty.
const memory = { mode: "source", slide: 0, held: false };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

class ArchieHome extends HTMLElement {
  connectedCallback() {
    this.input = () => this.querySelector("#assistantInput");
    this.base = this.input()?.dataset.placeholder || this.input()?.placeholder || "";
    this.addEventListener("click", this);
    this.addEventListener("keydown", this);
    this.addEventListener("pointerover", this);
    this.addEventListener("pointerout", this);
    this.addEventListener("focusin", this);
    this.addEventListener("focusout", this);
    if (this.querySelector("[data-nch-mode]")) this.setMode(memory.mode, false);
    if (this.querySelector("[data-nch-stage]")) {
      this.setSlide(memory.slide);
      this.timer = setInterval(() => {
        if (memory.held || reduced() || document.hidden || this.matches(":focus-within")) return;
        const n = this.querySelectorAll("[data-nch-slide]").length;
        this.setSlide((memory.slide + 1) % n);
      }, 4200);
    }
  }

  disconnectedCallback() {
    clearInterval(this.timer);
  }

  // The placeholder a mode or a row sets is the box's own until the next one
  // (composer.js restores `data-placeholder` when a chip leaves the box).
  setBase(text) {
    this.base = text;
    const input = this.input();
    if (input) input.dataset.placeholder = text;
    this.hint(text);
  }

  hint(text) {
    const input = this.input();
    if (!input || input.value) return;
    input.placeholder = text || this.base;
  }

  setMode(k, focus) {
    const tabs = [...this.querySelectorAll("[data-nch-mode]")];
    if (!tabs.some((t) => t.dataset.nchMode === k)) k = tabs[0]?.dataset.nchMode;
    memory.mode = k;
    tabs.forEach((t) => {
      const on = t.dataset.nchMode === k;
      t.setAttribute("aria-selected", String(on));
      t.classList.toggle("active", on);
      t.tabIndex = on ? 0 : -1;
      if (on) {
        this.setBase(t.dataset.nchHint);
        if (focus) t.focus();
      }
    });
    this.querySelectorAll("[data-nch-pane]").forEach((p) => (p.hidden = p.dataset.nchPane !== k));
  }

  setSlide(i) {
    memory.slide = i;
    this.querySelectorAll("[data-nch-slide]").forEach((s) => {
      const on = +s.dataset.nchSlide === i;
      s.classList.toggle("is-on", on);
      s.setAttribute("aria-hidden", String(!on));
      s.querySelector(".nch-slide__go")?.setAttribute("tabindex", on ? "0" : "-1");
      s.querySelectorAll("video[data-nch-autoplay]").forEach((v) =>
        on && !reduced() ? v.play().catch(() => {}) : v.pause(),
      );
    });
    this.querySelectorAll("[data-nch-slide-to]").forEach((r) => {
      const on = +r.dataset.nchSlideTo === i;
      r.setAttribute("aria-selected", String(on));
      r.tabIndex = on ? 0 : -1;
      r.classList.toggle("is-held", on && memory.held);
      if (on) {
        this.setBase(r.dataset.nchHint);
      }
    });
  }

  handleEvent(e) {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (e.type === "click") {
      const mode = t.closest("[data-nch-mode]");
      if (mode) return this.setMode(mode.dataset.nchMode, false);
      const to = t.closest("[data-nch-slide-to]");
      if (to) {
        memory.held = true;
        return this.setSlide(+to.dataset.nchSlideTo);
      }
      const fill = t.closest("[data-nch-fill]");
      if (fill) {
        const input = this.input();
        if (!input) return;
        input.value = fill.dataset.nchFill;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      }
      return;
    }
    if (e.type === "keydown") {
      // Arrow keys move along a tablist (modes, rows), the ARIA way.
      const tab = t.closest("[data-nch-mode],[data-nch-slide-to]");
      if (!tab || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      const list = [...tab.parentElement.children];
      const next = list[(list.indexOf(tab) + (/Right|Down/.test(e.key) ? 1 : list.length - 1)) % list.length];
      next.focus();
      next.click();
      return;
    }
    // Hover or focus on a starting point says, in the box, what it will do.
    const hinted = t.closest(".nch-chip[data-nch-hint]");
    if (e.type === "pointerover" || e.type === "focusin") {
      if (hinted) this.hint(hinted.dataset.nchHint);
      const media = t.closest("[data-nch-play]")?.querySelector("video");
      if (media && !media.dataset.nchAutoplay) media.play().catch(() => {});
    } else {
      if (hinted && !hinted.contains(e.relatedTarget)) this.hint(this.base);
      const box = t.closest("[data-nch-play]");
      const media = box?.querySelector("video");
      if (media && !media.dataset.nchAutoplay && !box.contains(e.relatedTarget)) media.pause();
    }
  }
}

if (!customElements.get("archie-home")) customElements.define("archie-home", ArchieHome);
