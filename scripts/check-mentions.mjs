// Self-check of the draft mentions (src/mentions.js): search, the name tagged
// in place or added at the end, no double mention, removal, the suggestion.
// Run: npm run check:mentions
import assert from "node:assert";
const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const M = await import(root + "/src/mentions.js");

assert.equal(M.mentionMode("twitter"), "search");
assert.equal(M.mentionMode("instagram"), "typed");
assert.equal(M.mentionMode("youtube"), null);

assert.deepEqual(M.searchMentions("linkedin", "n"), [], "2 characters minimum");
assert.equal(M.searchMentions("linkedin", "notion").length, 1);
assert.equal(M.searchMentions("linkedin", "linear").length, 2, "the ambiguous name");
assert.equal(M.searchMentions("twitter", "@notionhq")[0].handle, "NotionHQ");

const notionLi = M.searchMentions("linkedin", "notion")[0];
const notionX = M.searchMentions("x", "notion")[0];
const post = { network: "linkedin", text: ["We moved our docs to Notion last year.", "It stuck."] };

let r = M.applyMention(post, notionLi);
assert.equal(r.text[0], "We moved our docs to @Notion last year.", "tagged in place");
assert.ok(r.mentions["@Notion"]);
assert.equal(M.applyMention({ ...post, ...r }, notionLi), null, "already there");
assert.equal(M.applyMention(post, notionX).text[0], "We moved our docs to @NotionHQ last year.", "X takes the handle");

r = M.applyMention({ network: "linkedin", text: ["No name here."] }, notionLi);
assert.equal(r.text[0], "No name here. Shout-out to the team at @Notion.", "brought in by a sentence");
const jordanX = M.searchMentions("x", "jordan")[0];
assert.equal(
  M.applyMention({ network: "x", text: ["Ship weekly."] }, jordanX).text[0],
  "Ship weekly. Thanks to @jordanwrites for sharing this.",
);

const ig = M.typedAccount("instagram", "@notionhq", "Notion");
assert.equal(M.mentionText(ig), "@notionhq");
assert.ok(M.HANDLE_RE.test("notion.hq") && !M.HANDLE_RE.test("no..tion") && !M.HANDLE_RE.test("bad name"));

const tagged = { network: "linkedin", ...M.applyMention(post, notionLi) };
const gone = M.removeMention(tagged, "notion");
assert.equal(gone.text[0], post.text[0], "back to plain text");
assert.deepEqual(gone.mentions, {});
assert.equal(M.removeMention(post, "notion"), null);

const named = M.mentionsNamedIn([post, tagged, { network: "youtube", text: ["Notion"] }]);
assert.equal(named[0].name, "Notion");
assert.equal(named[0].drafts.length, 1, "not the mentioned one, not YouTube");
const said = (t) => M.mentionNameIn(t);
assert.deepEqual(said("mention Notion in the LinkedIn post"), { name: "Notion" });
assert.deepEqual(said("Can you tag Jordan Lee on post 2?"), { name: "Jordan Lee" });
assert.deepEqual(said("remove the mention of Notion"), { name: "Notion" });
assert.deepEqual(said("tag @NotionHQ"), { name: "NotionHQ", handle: "NotionHQ" });
assert.equal(said("mention them"), null);
assert.ok(M.UNMENTION_ASK.test("remove the mention of Notion") && !M.UNMENTION_ASK.test("mention Notion"));
assert.ok(M.UNMENTION_ASK.test("remove @Notion from the draft"));
assert.ok(!M.UNMENTION_ASK.test("delete all the drafts"));
assert.equal(M.nameForHandle("@notionhq".slice(1)), "Notion");
const appended = { network: "linkedin", text: ["No name here."] };
const withIt = { ...appended, ...M.applyMention(appended, notionLi) };
assert.deepEqual(M.removeMention(withIt, "notion").text, ["No name here."], "my sentence leaves with the mention");
console.log("mentions: ok");
