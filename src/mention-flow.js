// mention-flow — mentions in drafts, asked in the chat (flag draftMentions).
//
//   « mention Notion in the LinkedIn post », « tag Linear in all the drafts »,
//   « remove the mention of Notion », and my offer after writing drafts that
//   name a brand (postDraftResult).
//
// Each draft has one network, so I find the account network by network (the
// mention's text and rules: mentions.js). One account found → it goes in, the
// « what changed » card has the Undo. Several or none → I ask, with a search;
// Instagram / TikTok have no search (prod), so I ask for the username. The
// questions come one network at a time, then every draft changes at once.

import {
  postAssistantMessage,
  postUserTurn,
  postActivity,
  postRevisionTurn,
  postRevisionGroupTurn,
} from "./assistant.js?v=2629";
import * as inlineQuestion from "./inline-question.js?v=2629";
import { getPosts, updatePostContent } from "./posts-store.js?v=2629";
import { isFlagOn } from "./feature-flags.js?v=2629";
import { networkLabel, networkIcon, normalizeNetwork } from "./social-profiles.js?v=2629";
import { focusInPanel } from "./components/right-panel.js?v=2629";
import { escapeHtml } from "./utils.js?v=2629";
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
} from "./mentions.js?v=2629";

export { MENTION_ASK, UNMENTION_ASK, mentionNameIn } from "./mentions.js?v=2629";

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

// Add `said` ({ name, handle? }) to `drafts`, resolving the account per network.
export function mentionInDrafts(sessionId, drafts, said) {
  if (!said) return askWho(sessionId, (name) => mentionInDrafts(sessionId, drafts, { name }));
  // « @NotionHQ » names Notion: searched by its name on the other networks.
  if (said.handle && nameForHandle(said.handle)) said = { ...said, name: nameForHandle(said.handle) };
  const networks = [...new Set(drafts.map((d) => normalizeNetwork(d.network)))];
  const resolved = new Map(); // network → account, or null when skipped
  const questions = [];
  for (const n of networks.filter(mentionMode)) {
    if (mentionMode(n) === "typed") {
      if (said.handle && HANDLE_RE.test(said.handle)) resolved.set(n, typedAccount(n, said.handle, said.name));
      else questions.push(n);
      continue;
    }
    const found = searchMentions(n, said.name);
    if (found.length === 1) resolved.set(n, found[0]);
    else questions.push(n);
  }
  const total = questions.length;
  const next = () => {
    const n = questions.shift();
    if (!n) return apply(sessionId, drafts, resolved, said);
    const step = total > 1 ? `${networkLabel(n)} · ${total - questions.length} of ${total}` : networkLabel(n);
    askAccount(sessionId, n, said, step, (account) => {
      resolved.set(n, account);
      next();
    });
  };
  next();
}

function askWho(sessionId, onName) {
  postAssistantMessage(sessionId, "Who should I mention?");
  inlineQuestion.ask(sessionId, {
    title: null,
    stepLabel: "Mention",
    items: [],
    customPlaceholder: "A brand or a person",
    customFirst: true,
    customIcon: "ap-icon-at",
    skipLabel: "Not now",
    onCustom: (value) => {
      const name = value.trim().replace(/^@/, "");
      if (!name) return askWho(sessionId, onName);
      postUserTurn(sessionId, value.trim());
      onName(name);
    },
    onSkip: () => postAssistantMessage(sessionId, "Okay, no mention."),
  });
}

// One network's question: the search (LinkedIn, Facebook, X), or the username
// (Instagram, TikTok). Skipping leaves that network's drafts without it.
// `again`: a username just refused — the refusal already asked once more.
function askAccount(sessionId, network, said, step, done, again = false) {
  const label = networkLabel(network);
  const name = escapeHtml(said.name);
  const skip = { skipLabel: `Not on ${label}`, onSkip: () => done(null) };
  if (mentionMode(network) === "typed") {
    if (!again)
      postAssistantMessage(sessionId, `${label} has no search for mentions. What's ${name}'s ${label} username?`);
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
        postUserTurn(sessionId, `@${handle}`);
        if (!HANDLE_RE.test(handle)) {
          postAssistantMessage(
            sessionId,
            `That isn't a valid ${label} username: letters, numbers, periods and underscores, up to 30. What's the exact one?`,
          );
          return askAccount(sessionId, network, said, step, done, true);
        }
        done(typedAccount(network, handle, said.name));
      },
    });
    return;
  }
  const found = searchMentions(network, said.name);
  // The matches first, then everyone else the search can reach on that network.
  const accounts = [...found, ...mentionAccounts(network).filter((a) => !found.some((f) => f.id === a.id))];
  postAssistantMessage(
    sessionId,
    found.length
      ? `I found ${found.length} accounts named ${name} on ${label}. Which one?`
      : `I couldn't find ${name} on ${label}. Who should I mention there?`,
  );
  inlineQuestion.ask(sessionId, {
    title: null,
    stepLabel: step,
    searchable: true,
    searchPlaceholder: `Search ${label}…`,
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
      postUserTurn(sessionId, account.name);
      done(account);
    },
  });
}

const snapshot = (post) => ({
  text: [...post.text],
  hashtags: [...(post.hashtags || [])],
  cta: post.cta || "",
  language: post.language || null,
});

// Every draft rewritten at once, with its « what changed » card (one for all
// when there are several), then what I couldn't do, said once.
function commit(sessionId, edits, { intent, summary, groupSummary }) {
  postActivity(sessionId, ["modify_post"]);
  const cards = isFlagOn("draftChanges");
  const items = edits.map(({ post, next }) => {
    const before = snapshot(post);
    updatePostContent(sessionId, post.id, {
      text: next.text,
      mentions: next.mentions,
      revision: cards ? { before, intent, at: Date.now() } : null,
    });
    return { postId: post.id, network: post.network, before, after: { ...before, text: next.text } };
  });
  if (!cards)
    postAssistantMessage(
      sessionId,
      items.length === 1
        ? `${summary} [[post:${items[0].postId}]]`
        : `${groupSummary}${items.map((i) => `\n- [[post:${i.postId}]]`).join("")}`,
    );
  else if (items.length === 1) postRevisionTurn(sessionId, { ...items[0], intent, summary });
  else postRevisionGroupTurn(sessionId, { intent, items, summary: groupSummary });
  focusInPanel("post", items[0].postId);
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
  const name = escapeHtml(said.name);
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
  if (edits.length) {
    const one = edits[0].account;
    commit(sessionId, edits, {
      intent: "mention",
      summary: `I mentioned ${escapeHtml(one.name)} on ${networkLabel(one.network)}.`,
      groupSummary: `I mentioned ${name} in your ${edits.length} drafts.`,
    });
  } else if (!notes.length) postAssistantMessage(sessionId, "Okay, no mention.");
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
  const entity = escapeHtml(edits[0].next.entity);
  commit(sessionId, edits, {
    intent: "unmention",
    summary: `I took out the mention of ${entity}.`,
    groupSummary: `I took out the mention of ${entity} from your ${edits.length} drafts.`,
  });
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
