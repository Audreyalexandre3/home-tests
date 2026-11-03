// Who a draft can mention (flag draftMentions): what prod's mention search
// would answer, network by network. LinkedIn finds companies and the people
// who follow your Page, Facebook finds Pages, X finds users. Instagram and
// TikTok have no search in prod (you type the handle), so no account here.
//
// One entity = one name as a draft would write it; `accounts` = its account on
// each searchable network. Two entities share "Linear" on purpose: the name
// alone doesn't settle it, so I ask.
export const MENTION_DIRECTORY = [
  {
    id: "riverside",
    name: "Riverside",
    accounts: {
      linkedin: { kind: "company", name: "Riverside", caption: "Media production · 2,400 followers" },
      facebook: { name: "Riverside" },
      x: { name: "Riverside", handle: "riversidehq" },
    },
  },
  {
    id: "brightline",
    name: "Brightline",
    accounts: {
      linkedin: { kind: "company", name: "Brightline", caption: "Logistics software · 860 followers" },
      x: { name: "Brightline", handle: "brightline_ops" },
    },
  },
  {
    id: "agorapulse",
    name: "Agorapulse",
    accounts: {
      linkedin: { kind: "company", name: "Agorapulse", caption: "Social media management · 41,000 followers" },
      facebook: { name: "Agorapulse" },
      x: { name: "Agorapulse", handle: "agorapulse" },
    },
  },
  {
    id: "notion",
    name: "Notion",
    accounts: {
      linkedin: { kind: "company", name: "Notion", caption: "Software · 1.2M followers" },
      facebook: { name: "Notion" },
      x: { name: "Notion", handle: "NotionHQ" },
    },
  },
  {
    id: "linear",
    name: "Linear",
    accounts: {
      linkedin: { kind: "company", name: "Linear", caption: "Software · 98,000 followers" },
      x: { name: "Linear", handle: "linear" },
    },
  },
  {
    id: "linear-studio",
    name: "Linear",
    accounts: {
      linkedin: { kind: "company", name: "Linear Studio", caption: "Design agency · 1,100 followers" },
      x: { name: "Linear Studio", handle: "linearstudio" },
    },
  },
  {
    id: "figma",
    name: "Figma",
    accounts: {
      linkedin: { kind: "company", name: "Figma", caption: "Software · 820,000 followers" },
      facebook: { name: "Figma" },
      x: { name: "Figma", handle: "figma" },
    },
  },
  // People: on LinkedIn, only the followers of your Page can be mentioned.
  {
    id: "jordan-lee",
    name: "Jordan Lee",
    accounts: {
      linkedin: { kind: "person", name: "Jordan Lee", caption: "Head of Content at Riverside" },
      x: { name: "Jordan Lee", handle: "jordanwrites" },
    },
  },
  {
    id: "priya-nair",
    name: "Priya Nair",
    accounts: {
      linkedin: { kind: "person", name: "Priya Nair", caption: "VP Operations at Brightline" },
    },
  },
];
