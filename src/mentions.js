// Mentions in a draft (flag draftMentions). A mention is plain text in the
// draft — `@Notion` on LinkedIn / Facebook (the name, linked once published),
// `@NotionHQ` on X, Instagram, TikTok (the handle) — plus an entry in
// `post.mentions` keyed by that text, saying which account it points at. The
// card styles the keys it finds in the text; one rubbed out by hand simply
// stops showing. Undo and the word diff work on the text, as for any rewrite.
//
// What each network allows is prod's (Publishing's mention search): LinkedIn,
// Facebook and X are searched; Instagram and TikTok take a typed handle;
// YouTube has no mentions.

import { MENTION_DIRECTORY } from "./mocks.js?v=2613";
import { fold } from "./utils.js?v=2613";
import { normalizeNetwork } from "./social-profiles.js?v=2613";

const SEARCH = new Set(["linkedin", "facebook", "x"]);
const TYPED = new Set(["instagram", "tiktok"]);

/** "search", "typed" (the handle, no search), or null (no mentions). */
export function mentionMode(network) {
  const n = normalizeNetwork(network);
  return SEARCH.has(n) ? "search" : TYPED.has(n) ? "typed" : null;
}

// Prod's Instagram username check (wysiwyg-mention); TikTok gets the same.
export const HANDLE_RE = /^(?!.*\.\.)(?!.*\.$)(?!.*\.\d)[a-zA-Z0-9_.]{1,30}$/;

// Every account the search can return on a network:
// { id, entity, network, name, handle?, kind?, caption? }.
export function mentionAccounts(network) {
  const n = normalizeNetwork(network);
  return MENTION_DIRECTORY.filter((e) => e.accounts[n]).map((e) => ({
    id: `${e.id}:${n}`,
    entity: e.name,
    network: n,
    ...e.accounts[n],
  }));
}

// Prod searches from 2 characters, on the name and the handle.
export function searchMentions(network, query) {
  const q = fold(
    String(query || "")
      .trim()
      .replace(/^@/, ""),
  );
  if (q.length < 2) return [];
  return mentionAccounts(network).filter((a) => fold(`${a.name} ${a.handle || ""}`).includes(q));
}

/** The name behind a handle the search knows (« NotionHQ » → « Notion »), or null. */
export function nameForHandle(handle) {
  const h = fold(handle);
  return MENTION_DIRECTORY.find((e) => Object.values(e.accounts).some((a) => fold(a.handle) === h))?.name || null;
}

/** A handle typed for Instagram / TikTok, as an account. */
export function typedAccount(network, handle, entity) {
  const h = handle.replace(/^@/, "");
  return {
    id: `${normalizeNetwork(network)}:${h}`,
    entity: entity || h,
    network: normalizeNetwork(network),
    name: h,
    handle: h,
  };
}

/** The text the mention takes in the draft. */
export function mentionText(account) {
  return account.network === "linkedin" || account.network === "facebook" ? `@${account.name}` : `@${account.handle}`;
}

/** The line under an account in a picker. */
export function mentionCaption(account) {
  if (account.network === "linkedin")
    return account.kind === "person" ? `${account.caption} · Follows your Page` : `Company · ${account.caption}`;
  if (account.network === "facebook") return "Page";
  return `@${account.handle}`;
}

// The asks. « tag » alone is a mention; « remove the mention » takes one out.
export const MENTION_ASK = /\b(mention|tag)\b/i;
// « remove @Notion from the draft » too: an @ names a mention, not a draft.
export const UNMENTION_ASK = /\b(remove|delete|drop|take out)\b.*(\b(mention|tag)\b|(^|\s)@\w)|\buntag\b/i;
const NOT_A_NAME = /^(it|them|this|that|these|someone|somebody|people|accounts?)$/i;

// Who the sentence names: « @NotionHQ » (a handle), else the words after
// « mention / tag (of) » up to « in / on / to / from ». null when it doesn't say.
export function mentionNameIn(text) {
  const at = text.match(/(?:^|\s)@([\w.]+)/)?.[1];
  if (at) return { name: at, handle: at };
  const name = text
    .match(/\b(?:mention|tag)s?\s+(?:of\s+)?(.+?)(?:\s+(?:in|on|to|from|into|for)\b|[.,!?]|$)/i)?.[1]
    ?.replace(/^(?:the|a|an)\s+/i, "")
    .trim();
  return name && !NOT_A_NAME.test(name) ? { name } : null;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// The name as a word, not already behind an @.
const nameRe = (name) => new RegExp(`(^|[^@\\w])(${escapeRe(name)})(?!\\w)`, "i");

// The draft with the mention in: where the text already names it, the name
// becomes the mention; else it goes at the end. null when it's already there.
export function applyMention(post, account) {
  const key = mentionText(account);
  const text = [...(post.text || [])];
  if (text.some((p) => p.includes(key))) return null;
  const re = nameRe(account.entity);
  const i = text.findIndex((p) => re.test(p));
  if (i >= 0) text[i] = text[i].replace(re, (_, lead) => `${lead}${key}`);
  else if (text.length) text[text.length - 1] = `${text[text.length - 1]} ${key}`;
  else text.push(key);
  // `added`: not in the text before, so taking it out removes it whole.
  const mentions = { ...(post.mentions || {}), [key]: { ...account, added: i < 0 } };
  return { text, mentions };
}

// The draft without a mention: back to the plain name ("@NotionHQ" → "Notion")
// where the text named it, gone where I added it. `query` is what was said
// ("Notion", "@NotionHQ"); null when the draft has none.
export function removeMention(post, query) {
  const q = fold(String(query || "").replace(/^@/, ""));
  const key = Object.keys(post.mentions || {}).find((k) => {
    const a = post.mentions[k];
    return post.text.some((p) => p.includes(k)) && fold(`${a.entity} ${a.name} ${a.handle || ""}`).includes(q);
  });
  if (!key) return null;
  const { [key]: gone, ...mentions } = post.mentions;
  const text = post.text
    .map((p) => (gone.added ? p.split(` ${key}`).join("").split(key).join("") : p.split(key).join(gone.entity)))
    .filter((p, i) => p || post.text[i] !== key);
  return { text, mentions, entity: gone.entity };
}

// Names from the directory a batch of drafts writes without mentioning them,
// with the drafts that do: [{ name, drafts }], first named first.
export function mentionsNamedIn(drafts) {
  const names = [...new Set(MENTION_DIRECTORY.map((e) => e.name))];
  return names
    .map((name) => ({
      name,
      drafts: drafts.filter(
        (d) =>
          mentionMode(d.network) &&
          (d.text || []).some((p) => nameRe(name).test(p)) &&
          !Object.values(d.mentions || {}).some((a) => a.entity === name),
      ),
    }))
    .filter((m) => m.drafts.length);
}
