// Who a draft can mention (flag draftMentions): what prod's mention search
// would answer, network by network. LinkedIn finds companies and the people
// who follow your Page, Facebook finds Pages, X finds users. Instagram and
// TikTok have no search in prod (you type the handle), so no account here.
//
// One entity = one name as a draft would write it; `accounts` = its account on
// each searchable network. Two entities share "Linear" on purpose: the name
// alone doesn't settle it, so I ask. A person carries a `photo` (their face in
// the picker); a company a `tint` (its square logo, drawn from its initial —
// third-party colours are data, like social-profiles.js's accents).
const FACE = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=faces&w=96&h=96&q=70`;

export const MENTION_DIRECTORY = [
  {
    id: "riverside",
    name: "Riverside",
    tint: "#1F6F5C",
    accounts: {
      linkedin: { kind: "company", name: "Riverside", caption: "Media production · 2,400 followers" },
      facebook: { name: "Riverside" },
      x: { name: "Riverside", handle: "riversidehq" },
    },
  },
  {
    id: "brightline",
    name: "Brightline",
    tint: "#E4572E",
    accounts: {
      linkedin: { kind: "company", name: "Brightline", caption: "Logistics software · 860 followers" },
      x: { name: "Brightline", handle: "brightline_ops" },
    },
  },
  {
    id: "agorapulse",
    name: "Agorapulse",
    tint: "#F15A22",
    accounts: {
      linkedin: { kind: "company", name: "Agorapulse", caption: "Social media management · 41,000 followers" },
      facebook: { name: "Agorapulse" },
      x: { name: "Agorapulse", handle: "agorapulse" },
    },
  },
  {
    id: "notion",
    name: "Notion",
    tint: "#191919",
    accounts: {
      linkedin: { kind: "company", name: "Notion", caption: "Software · 1.2M followers" },
      facebook: { name: "Notion" },
      x: { name: "Notion", handle: "NotionHQ" },
    },
  },
  {
    id: "linear",
    name: "Linear",
    tint: "#5E6AD2",
    accounts: {
      linkedin: { kind: "company", name: "Linear", caption: "Software · 98,000 followers" },
      x: { name: "Linear", handle: "linear" },
    },
  },
  {
    id: "linear-studio",
    name: "Linear",
    tint: "#2E7D32",
    accounts: {
      linkedin: { kind: "company", name: "Linear Studio", caption: "Design agency · 1,100 followers" },
      x: { name: "Linear Studio", handle: "linearstudio" },
    },
  },
  {
    id: "figma",
    name: "Figma",
    tint: "#A259FF",
    accounts: {
      linkedin: { kind: "company", name: "Figma", caption: "Software · 820,000 followers" },
      facebook: { name: "Figma" },
      x: { name: "Figma", handle: "figma" },
    },
  },
  // People: on LinkedIn, only the followers of your Page can be mentioned;
  // Facebook mentions Pages only, so no person there.
  {
    id: "jordan-lee",
    name: "Jordan Lee",
    photo: FACE("photo-1500648767791-00dcc994a43e"),
    accounts: {
      linkedin: { kind: "person", name: "Jordan Lee", caption: "Head of Content at Riverside" },
      x: { name: "Jordan Lee", handle: "jordanwrites" },
    },
  },
  {
    id: "priya-nair",
    name: "Priya Nair",
    photo: FACE("photo-1494790108377-be9c29b29330"),
    accounts: {
      linkedin: { kind: "person", name: "Priya Nair", caption: "VP Operations at Brightline" },
    },
  },
  {
    id: "daniel-brooks",
    name: "Daniel Brooks",
    photo: FACE("photo-1507003211169-0a1dd7228f2d"),
    accounts: {
      linkedin: { kind: "person", name: "Daniel Brooks", caption: "CEO at Riverside" },
      x: { name: "Daniel Brooks", handle: "dbrooks" },
    },
  },
  {
    id: "hana-sato",
    name: "Hana Sato",
    photo: FACE("photo-1438761681033-6461ffad8d80"),
    accounts: {
      linkedin: { kind: "person", name: "Hana Sato", caption: "Community Lead at Linear" },
      x: { name: "Hana Sato", handle: "hanasato" },
    },
  },
  {
    id: "lucas-moreau",
    name: "Lucas Moreau",
    photo: FACE("photo-1506794778202-cad84cf45f1d"),
    accounts: {
      linkedin: { kind: "person", name: "Lucas Moreau", caption: "Growth Lead at Notion" },
      x: { name: "Lucas Moreau", handle: "lucasmoreau" },
    },
  },
  {
    id: "maya-okafor",
    name: "Maya Okafor",
    photo: FACE("photo-1534528741775-53994a69daeb"),
    accounts: {
      linkedin: { kind: "person", name: "Maya Okafor", caption: "Product Designer at Figma" },
    },
  },
];
