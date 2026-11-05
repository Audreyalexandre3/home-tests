// HOME-10's start modal (flag homeStart, 2026-11-05, Audrey's proposal).
//
// A chip under the composer is a small call to action, the way Opus Clip does
// it: it opens THIS dialog, scoped to one kind of source (a video, a file, a
// link, some text). The dialog takes the source first; once it has one, it
// shows what I can make from that source, the right outcome pre-chosen (Get
// clips for a video). One confirm and the chat opens on that flow: the source
// lands in the chat and the source-use question is answered already
// (presetSourceUse), so it isn't asked a second time.
//
// The composer stays the open path: dropping straight into it still asks.
// The chips are the guided path.
//
// Self-contained: own markup, own state, mounted on <body> on first open (the
// modal coordinator makes everything else inert, so the dialog must be a
// direct child of body).

import { escapeHtml } from "../utils.js?v=2689";
import { dropzoneHTML, bindDropzone } from "./dropzone.js?v=2689";
import { detectUrlService } from "../url-services.js?v=2689";
import { classifyFile, pushScriptedSource, completeScriptedSource } from "../sources-stream.js?v=2689";
import { postUserTurn } from "../assistant.js?v=2689";
import { requestOpen, notifyClose } from "../modal-coordinator.js?v=2689";
import { presetSourceUse } from "../screens/session.js?v=2689";

const MODAL_ID = "homeStart";
const esc = escapeHtml;

// What I can make, by source. The first is the one pre-chosen.
const OUTCOMES = {
  video: [
    {
      value: "clips",
      label: "Get clips",
      line: "Vertical clips with subtitles, ready to post.",
      icon: "ap-icon-video",
    },
    { value: "post", label: "Write posts from it", line: "Drafts from what the video says.", icon: "ap-icon-pen" },
    {
      value: "ideas",
      label: "Find post ideas",
      line: "Hooks, stats and quotes to pick from.",
      icon: "ap-icon-sparkles",
    },
  ],
  doc: [
    {
      value: "ideas",
      label: "Find post ideas",
      line: "Hooks, stats and quotes to pick from.",
      icon: "ap-icon-sparkles",
    },
    { value: "post", label: "Write a post", line: "A draft straight from what it says.", icon: "ap-icon-pen" },
    { value: "summary", label: "Sum it up", line: "The gist in a few lines.", icon: "ap-icon-file--text" },
  ],
};

// The words that go in the chat when a choice is confirmed: the user's side.
const ECHO = {
  clips: "Cut it into clips",
  post: "Write a post about it",
  ideas: "Find post ideas in it",
  summary: "Sum it up",
};

// One dialog per chip.
const KINDS = {
  video: {
    title: "Add a video",
    accept: ".mp4,.mov,.m4v,.webm",
    lead: "Drop a video here, or",
    sub: "MP4 or MOV, up to 100 MB",
    link: { label: "Or paste a YouTube link", placeholder: "https://youtube.com/watch?v=…" },
    example: { filename: "Demo replay.mp4", meta: "Video · 2:14", source: "Video" },
  },
  pdf: {
    title: "Add a file",
    accept: ".pdf,.doc,.docx,.txt,.md,.ppt,.pptx",
    lead: "Drop a file here, or",
    sub: "PDF, Word, slides or text, up to 100 MB",
    example: { filename: "Roadmap Q3.pdf", meta: "PDF · 12 pages", source: "PDF" },
  },
  url: {
    title: "Add a link",
    link: { label: "Paste a link", placeholder: "https://example.com/article" },
    hint: "An article, a LinkedIn post, a YouTube video, a Google Doc…",
    example: { filename: "blog.example.com/post", meta: "Link", source: "URL", url: "https://blog.example.com/post" },
  },
};

let backdrop, dialog, body, footer;
let state = null;

function mount() {
  if (dialog) return;
  backdrop = document.createElement("div");
  backdrop.className = "home-start__backdrop";
  backdrop.hidden = true;
  dialog = document.createElement("aside");
  dialog.className = "ap-dialog home-start";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "homeStartTitle");
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="ap-dialog-header"><span class="ap-dialog-title" id="homeStartTitle"></span></div>
    <button class="ap-dialog-close" type="button" data-hs-close aria-label="Close"><i class="ap-icon-close"></i></button>
    <div class="ap-dialog-content home-start__content" data-hs-body></div>
    <div class="ap-dialog-footer home-start__footer" data-hs-footer></div>`;
  document.body.append(backdrop, dialog);
  body = dialog.querySelector("[data-hs-body]");
  footer = dialog.querySelector("[data-hs-footer]");

  backdrop.addEventListener("click", close);
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter" && e.target.matches("[data-hs-link]")) {
      e.preventDefault();
      takeLink(e.target.value);
    }
  });
  dialog.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-hs-close]")) return close();
    if (t.closest("[data-hs-example]")) return setSource({ ...KINDS[state.kind].example });
    if (t.closest("[data-hs-remove]")) return setSource(null);
    if (t.closest("[data-hs-take-link]")) return takeLink(dialog.querySelector("[data-hs-link]")?.value);
    const pick = t.closest("[data-hs-outcome]");
    if (pick) {
      state.outcome = pick.dataset.hsOutcome;
      return render();
    }
    if (t.closest("[data-hs-go]")) return go();
  });
  dialog.addEventListener("input", (e) => {
    if (e.target.matches("[data-hs-link]")) {
      state.linkDraft = e.target.value;
      const svc = detectUrlService(e.target.value);
      const say = dialog.querySelector("[data-hs-svc]");
      if (say) say.textContent = svc ? `I recognised a ${svc.name} link.` : "";
    }
  });
  bindDropzone(dialog, {
    onFiles: (files) => {
      const f = files[0];
      const kind = classifyFile(f);
      if (!kind.ok) {
        state.error = kind.reason;
        return render();
      }
      setSource({
        filename: f.name,
        meta: `${kind.kind} · ${size(f.size)}`,
        source: kind.kind,
      });
    },
  });
}

const size = (b) =>
  b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

function takeLink(value) {
  const v = (value || "").trim();
  if (!/^https?:\/\//i.test(v)) {
    state.error = "A link starts with http:// or https://.";
    return render();
  }
  const svc = detectUrlService(v);
  const isVideo = svc?.name === "YouTube";
  setSource({
    filename: v.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    meta: svc ? `${svc.name} link` : "Link",
    // A YouTube link is a video: it gets the clips.
    source: isVideo ? "Video" : "URL",
    url: v,
  });
}

// The source decides what I offer; the first outcome is pre-chosen.
function setSource(src) {
  state.source = src;
  state.error = "";
  state.outcome = src ? outcomesFor(src)[0].value : null;
  render();
}

const outcomesFor = (src) => (src?.source === "Video" ? OUTCOMES.video : OUTCOMES.doc);

const iconFor = (src) =>
  src.source === "Video" ? "ap-icon-video" : src.source === "URL" ? "ap-icon-link" : "ap-icon-file--pdf";

function render() {
  const k = KINDS[state.kind];
  dialog.querySelector("#homeStartTitle").textContent = k.title;
  const src = state.source;
  const error = state.error
    ? `<div class="ap-infobox error home-start__error"><span>${esc(state.error)}</span></div>`
    : "";

  let take = "";
  if (src) {
    take = `
      <div class="home-start__source">
        <span class="home-start__source-icon" aria-hidden="true"><i class="${iconFor(src)}"></i></span>
        <span class="home-start__source-say">
          <span class="home-start__source-name">${esc(src.filename)}</span>
          <span class="home-start__source-meta">${esc(src.meta)}</span>
        </span>
        <button type="button" class="ap-icon-button transparent grey" data-hs-remove aria-label="Remove ${esc(src.filename)}"><i class="ap-icon-close"></i></button>
      </div>`;
  } else {
    const drop = k.accept ? dropzoneHTML({ lead: k.lead, sub: k.sub, accept: k.accept, compact: !!k.link }) : "";
    const link = k.link
      ? `
        <div class="ap-form-field home-start__link">
          <label for="homeStartLink">${esc(k.link.label)}</label>
          <div class="home-start__link-row">
            <div class="ap-input-group">
              <input id="homeStartLink" type="url" data-hs-link placeholder="${esc(k.link.placeholder)}" value="${esc(state.linkDraft || "")}" autocomplete="off" ${k.accept ? "" : "autofocus"} />
            </div>
            <button type="button" class="ap-button stroked grey" data-hs-take-link>Add</button>
          </div>
          <span class="home-start__svc" data-hs-svc aria-live="polite"></span>
        </div>`
      : "";
    const example = k.example
      ? `<button type="button" class="ap-button ghost blue home-start__example" data-hs-example>No file at hand? Use an example</button>`
      : "";
    take = `${k.hint ? `<p class="home-start__hint">${esc(k.hint)}</p>` : ""}${drop}${link}${example}`;
  }

  const outcomes = src
    ? `
      <fieldset class="home-start__outcomes">
        <legend class="home-start__legend">What should I make?</legend>
        ${outcomesFor(src)
          .map(
            (o) => `
          <button type="button" class="home-start__outcome${state.outcome === o.value ? " is-on" : ""}" data-hs-outcome="${o.value}" aria-pressed="${state.outcome === o.value}">
            <span class="home-start__outcome-icon" aria-hidden="true"><i class="${o.icon}"></i></span>
            <span class="home-start__outcome-say">
              <span class="home-start__outcome-name">${esc(o.label)}</span>
              <span class="home-start__outcome-line">${esc(o.line)}</span>
            </span>
            <span class="home-start__outcome-check" aria-hidden="true"><i class="ap-icon-check"></i></span>
          </button>`,
          )
          .join("")}
      </fieldset>`
    : "";

  body.innerHTML = `${error}${take}${outcomes}`;

  const chosen = src && outcomesFor(src).find((o) => o.value === state.outcome);
  footer.innerHTML = `
    <div class="ap-dialog-footer-right">
      <button type="button" class="ap-button ghost grey" data-hs-close>Cancel</button>
      <button type="button" class="ap-button primary orange" data-hs-go ${chosen ? "" : "disabled"}>${esc(chosen ? chosen.label : "Continue")}</button>
    </div>`;
}

// Confirm: the source lands in this chat, my question is already answered,
// and the chosen flow runs once the source is read.
function go() {
  const src = state.source;
  const outcome = state.outcome;
  if (!src || !outcome) return;
  const sessionId = decodeURIComponent((location.hash.match(/#\/session\/([^?]+)/) || [])[1] || "");
  close();
  if (!sessionId) return;
  presetSourceUse(sessionId, outcome);
  const sourceId = pushScriptedSource({ filename: src.filename, kind: src.source, sessionId });
  postUserTurn(sessionId, ECHO[outcome]);
  setTimeout(() => completeScriptedSource(sourceId, { signal: "Medium relevance", signalColor: "tagOrange" }), 2500);
}

export function openHomeStart(kind, { filename = null } = {}) {
  if (!KINDS[kind]) return;
  mount();
  state = { kind, source: null, outcome: null, error: "", linkDraft: "" };
  // A card that names the material (the latest video) opens with it in.
  if (filename) state.source = { filename, meta: "From your library", source: kind === "video" ? "Video" : "PDF" };
  if (state.source) state.outcome = outcomesFor(state.source)[0].value;
  requestOpen(MODAL_ID, close);
  render();
  backdrop.hidden = false;
  dialog.hidden = false;
  dialog.classList.add("open");
  document.body.classList.add("has-modal");
}

export function close() {
  if (!dialog || dialog.hidden) return;
  dialog.classList.remove("open");
  dialog.hidden = true;
  backdrop.hidden = true;
  document.body.classList.remove("has-modal");
  notifyClose(MODAL_ID);
}
