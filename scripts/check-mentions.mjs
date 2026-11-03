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
const said = (t) => M.mentionNamesIn(t).map((s) => s.name);
assert.deepEqual(said("mention Notion in the LinkedIn post"), ["Notion"]);
assert.deepEqual(said("Can you tag Jordan Lee on post 2?"), ["Jordan Lee"]);
assert.deepEqual(said("remove the mention of Notion"), ["Notion"]);
assert.deepEqual(M.mentionNamesIn("tag @NotionHQ"), [{ name: "NotionHQ", handle: "NotionHQ" }]);
assert.deepEqual(said("mention them"), []);
assert.deepEqual(said("Mention Notion, Figma and Jordan Lee in post 1"), ["Notion", "Figma", "Jordan Lee"]);
assert.deepEqual(said("tag @a and @b.c"), ["a", "b.c"]);
assert.equal(M.joinList(["@a", "@b", "@c"]), "@a, @b and @c");

// Several at once: one named in place, the others in one sentence of mine.
const figmaLi = M.searchMentions("linkedin", "figma")[0];
const jordanLi = M.searchMentions("linkedin", "jordan")[0];
const many = M.applyMentions(post, [notionLi, figmaLi, jordanLi]);
assert.deepEqual(many.text, [
  "We moved our docs to @Notion last year.",
  "It stuck. Shout-out to @Figma and @Jordan Lee.",
]);
const lessOne = M.removeMention({ ...post, ...many }, "figma");
assert.equal(
  lessOne.text[1],
  "It stuck. Thanks to @Jordan Lee for sharing this.",
  "the sentence rewritten for the rest",
);
assert.equal(lessOne.mentions["@Jordan Lee"].added, "Thanks to @Jordan Lee for sharing this.");
const none = M.removeMentions({ ...post, ...many }, [{ name: "Notion" }, { name: "Figma" }, { name: "Jordan" }]);
assert.deepEqual(none.text, post.text, "all out, back to the draft as it was");
assert.deepEqual(none.entities, ["Notion", "Figma", "Jordan Lee"]);
assert.ok(M.UNMENTION_ASK.test("remove the mention of Notion") && !M.UNMENTION_ASK.test("mention Notion"));
assert.ok(M.UNMENTION_ASK.test("remove @Notion from the draft"));
assert.ok(!M.UNMENTION_ASK.test("delete all the drafts"));
assert.equal(M.nameForHandle("@notionhq".slice(1)), "Notion");
const appended = { network: "linkedin", text: ["No name here."] };
const withIt = { ...appended, ...M.applyMention(appended, notionLi) };
assert.deepEqual(M.removeMention(withIt, "notion").text, ["No name here."], "my sentence leaves with the mention");
console.log("mentions: ok");
