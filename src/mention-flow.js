// mention-flow — mentions in drafts, asked in the chat (flag draftMentions).
//
//   « mention Notion in the LinkedIn post », « tag Linear in all the drafts »,
//   « remove the mention of Notion », and my offer after writing drafts that
//   name a brand (postDraftResult).
//
// Each draft has one network, so I ask which account network by network (the
// mention's text and rules: mentions.js): a search opened on the name said,
// even when one account matches — you pick, I don't guess (2026-11-03).
// Instagram / TikTok have no search (prod), so I ask for the username. The
// questions come one network at a time, then every draft changes at once. Your
// pick echoes as a chip; I answer in one sentence, no « what changed » card.

import { postAssistantMessage, postUserTurn, postActivity, postSelectionEcho } from "./assistant.js?v=2627";
import * as inlineQuestion from "./inline-question.js?v=2627";
import { getPosts, updatePostContent } from "./posts-store.js?v=2627";
import { isFlagOn } from "./feature-flags.js?v=2627";
import { networkLabel, networkIcon, normalizeNetwork } from "./social-profiles.js?v=2627";
import { focusInPanel } from "./components/right-panel.js?v=2627";
import { escapeHtml } from "./utils.js?v=2627";
import {
  HANDLE_RE,
  mentionMode,
  searchMentions,
  mentionAccounts,
  typedAccount,
  mentionCaption,
  applyMention,
  removeMention,
  mentionsNamedIn,
  nameForHandle,
} from "./mentions.js?v=2627";

export { MENTION_ASK, UNMENTION_ASK, mentionNameIn } from "./mentions.js?v=2627";

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

// Add `said` ({ name, handle? }, or null when the sentence names nobody) to
// `drafts`, the account asked network by network.
export function mentionInDrafts(sessionId, drafts, said) {
  // « @NotionHQ » names Notion: searched by its name on the other networks.
  if (said?.handle && nameForHandle(said.handle)) said = { ...said, name: nameForHandle(said.handle) };
  const networks = [...new Set(drafts.map((d) => normalizeNetwork(d.network)))];
  const resolved = new Map(); // network → account, or null when skipped
  const questions = [];
  for (const n of networks.filter(mentionMode)) {
    // A username you typed yourself is your pick; anything else, I ask.
    if (mentionMode(n) === "typed" && said?.handle && HANDLE_RE.test(said.handle))
      resolved.set(n, typedAccount(n, said.handle, said.name));
    else questions.push(n);
  }
  const total = questions.length;
  const next = () => {
    const n = questions.shift();
    if (!n) return apply(sessionId, drafts, resolved, said);
    const step = total > 1 ? `${networkLabel(n)} · ${total - questions.length} of ${total}` : networkLabel(n);
    askAccount(sessionId, n, said, step, (account) => {
      resolved.set(n, account);
      // Named by your first pick: the next network's search opens on it.
      if (!said && account) said = { name: account.entity };
      next();
    });
  };
  next();
}

// One network's question: the search (LinkedIn, Facebook, X), or the username
// (Instagram, TikTok). Skipping leaves that network's drafts without it.
// `again`: a username just refused — the refusal already asked once more.
function askAccount(sessionId, network, said, step, done, again = false) {
  const label = networkLabel(network);
  const name = said ? escapeHtml(said.name) : "";
  const skip = { skipLabel: `Not on ${label}`, onSkip: () => done(null) };
  if (mentionMode(network) === "typed") {
    if (!again)
      postAssistantMessage(
        sessionId,
        `${label} has no search for mentions. ${name ? `What's ${name}'s ${label} username?` : `Which ${label} username should I mention?`}`,
      );
    inlineQuestion.ask(sessionId, {
      title: null,
      stepLabel: step,
      items: [],
      customPlaceholder: "@username",
      customFirst: true,
      customIcon: "ap-icon-at",
      ...skip,
      onCustom: (value) => {
        const handle = value.trim().replace(/^@/, "");
        if (!HANDLE_RE.test(handle)) {
          postUserTurn(sessionId, `@${handle}`);
          postAssistantMessage(
            sessionId,
            `That isn't a valid ${label} username: letters, numbers, periods and underscores, up to 30. What's the exact one?`,
          );
          return askAccount(sessionId, network, said, step, done, true);
        }
        postSelectionEcho(sessionId, { icon: networkIcon(network), title: `@${handle}`, meta: label });
        done(typedAccount(network, handle, said?.name));
      },
    });
    return;
  }
  const found = said ? searchMentions(network, said.name) : [];
  // Every account the search can reach on that network, the matches first; the
  // search opens on the name, so only the matches show until it's cleared.
  const accounts = [...found, ...mentionAccounts(network).filter((a) => !found.some((f) => f.id === a.id))];
  postAssistantMessage(
    sessionId,
    !said
      ? `Who should I mention on ${label}?`
      : found.length
        ? `Which ${name} should I mention on ${label}?`
        : `I couldn't find ${name} on ${label}. Search for the account:`,
  );
  inlineQuestion.ask(sessionId, {
    title: null,
    stepLabel: step,
    searchable: true,
    searchPlaceholder: `Search ${label}…`,
    searchQuery: found.length ? said.name : "",
    items: accounts.map((a) => ({
      value: a.id,
      label: a.name,
      caption: mentionCaption(a),
      search: `${a.name} ${a.handle || ""}`,
      avatar: { initials: initials(a.name), networkIcon: networkIcon(network) },
    })),
    ...skip,
    onPick: (id) => {
      const account = accounts.find((a) => a.id === id);
      if (!account) return;
      postSelectionEcho(sessionId, { icon: networkIcon(network), title: account.name, meta: mentionCaption(account) });
      done(account);
    },
  });
}

// Every draft changes at once, then one sentence of mine names them: a mention
// is no rewrite, so no « what changed » card (and `revision` is cleared, as a
// hand edit does, so an earlier rewrite's marks don't claim it).
function commit(sessionId, edits, said, where = "in") {
  postActivity(sessionId, ["modify_post"]);
  for (const { post, next } of edits)
    updatePostContent(sessionId, post.id, { text: next.text, mentions: next.mentions, revision: null });
  postAssistantMessage(
    sessionId,
    edits.length === 1
      ? `${said} ${where} [[post:${edits[0].post.id}]].`
      : `${said} ${where} these drafts:${edits.map((e) => `\n- [[post:${e.post.id}]]`).join("")}`,
  );
  focusInPanel("post", edits[0].post.id);
}

function apply(sessionId, drafts, resolved, said) {
  const edits = [];
  const notes = [];
  const left = [];
  const already = [];
  const typed = [];
  for (const d of drafts) {
    const post = getPosts(sessionId).find((p) => p.id === d.id);
    if (!post) continue;
    const n = normalizeNetwork(post.network);
    if (!mentionMode(n)) {
      notes.push(`${networkLabel(n)} doesn't support mentions, so [[post:${post.id}]] stays as it is.`);
      continue;
    }
    const account = resolved.get(n);
    if (!account) {
      left.push(post);
      continue;
    }
    const next = applyMention(post, account);
    if (!next) already.push(post);
    else edits.push({ post, next, account });
    if (next && mentionMode(n) === "typed" && !typed.includes(account)) typed.push(account);
  }
  const first = edits[0]?.account;
  const name = escapeHtml(edits.length === 1 || !said ? first?.name || said?.name || "" : said.name);
  if (already.length) notes.push(`${already.map((p) => `[[post:${p.id}]]`).join(", ")} already mentions ${name}.`);
  if (left.length) notes.push(`I left ${left.map((p) => `[[post:${p.id}]]`).join(", ")} without the mention.`);
  // Prod's verify link: nothing checks a typed username, so I point at it.
  for (const a of typed) {
    const url =
      a.network === "tiktok" ? `https://www.tiktok.com/@${a.handle}` : `https://www.instagram.com/${a.handle}/`;
    notes.push(
      `I can't look up ${networkLabel(a.network)} usernames, so <a class="ap-link" href="${url}" target="_blank" rel="noopener">make sure @${a.handle} is the right account</a>.`,
    );
  }
  if (edits.length) commit(sessionId, edits, `I mentioned ${name}`);
  else if (!notes.length) postAssistantMessage(sessionId, "Okay, no mention.");
  if (notes.length) postAssistantMessage(sessionId, notes.join("\n\n"));
}

// « Remove the mention of Notion »: the mention goes back to the plain name.
export function unmentionInDrafts(sessionId, drafts, said) {
  const edits = drafts
    .map((d) => getPosts(sessionId).find((p) => p.id === d.id))
    .filter(Boolean)
    .map((post) => ({ post, next: said ? removeMention(post, said.handle || said.name) : null }))
    .filter((e) => e.next);
  if (!edits.length) {
    postAssistantMessage(
      sessionId,
      said
        ? `${drafts.length === 1 ? "That draft doesn't" : "None of these drafts"} mention ${escapeHtml(said.name)}.`
        : "Which mention should I take out? Name the brand or the person.",
    );
    return;
  }
  commit(sessionId, edits, `I took out the mention of ${escapeHtml(edits[0].next.entity)}`, "from");
}

// After writing drafts: when they name someone the search knows and don't
// mention them, I offer to. ponytail: the first name found only, once per
// batch; list them all if one isn't enough.
export function offerMentions(sessionId, drafts) {
  if (!isFlagOn("draftMentions") || inlineQuestion.isActive(sessionId)) return;
  const [m] = mentionsNamedIn(drafts);
  if (!m) return;
  const n = m.drafts.length;
  postAssistantMessage(
    sessionId,
    n === 1
      ? `[[post:${m.drafts[0].id}]] names ${m.name}. Should I mention their account?`
      : `${n} of these drafts name ${m.name}. Should I mention their account?`,
  );
  const yes = `Mention ${m.name}`;
  inlineQuestion.ask(sessionId, {
    title: null,
    stepLabel: "Mention",
    items: [],
    actions: [
      { value: "no", label: "Not now", stroked: true },
      { value: "yes", label: yes, primary: true },
    ],
    onPick: (choice) => {
      postUserTurn(sessionId, choice === "yes" ? yes : "Not now");
      if (choice === "yes") mentionInDrafts(sessionId, m.drafts, { name: m.name });
      else postAssistantMessage(sessionId, "Okay, no mention.");
    },
  });
}
