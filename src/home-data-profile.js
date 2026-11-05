// HOME-11's data profiles (prototype only, 2026-11-05). The mocks are a rich
// account; this lets the Admin menu pretend the brand has less, to show what
// « Ideas for this week » falls back to when a card has nothing real to show.
//
//   rich          Topics, a video in the library, a best post
//   no-listening  no Topic Feed: the Topic card asks to follow the market
//   no-video      nothing in the video library: the clips demo instead
//   few-posts     too little history for a « best » post: the latest one
//   nothing       none of the three: listening setup, clips demo, website
//
// Stored like the user mode: localStorage, read at render, a change reloads.

const KEY = "archie-home-data";

export const HOME_DATA_PROFILES = [
  { value: "rich", label: "Rich account", hint: "Topics, a video, a best post (default)" },
  { value: "no-listening", label: "No listening", hint: "No Topic Feed set up" },
  { value: "no-video", label: "No video", hint: "Nothing in the video library" },
  { value: "few-posts", label: "Few posts", hint: "Not enough history for a best post" },
  { value: "nothing", label: "Nothing yet", hint: "No listening, no video, no posts" },
];

export function getHomeDataProfile() {
  try {
    const v = window.localStorage.getItem(KEY);
    return HOME_DATA_PROFILES.some((p) => p.value === v) ? v : "rich";
  } catch {
    return "rich";
  }
}

export function setHomeDataProfile(value) {
  try {
    if (!value || value === "rich") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, value);
  } catch {
    // ignore
  }
}

/** What the brand has, under the active profile. */
export function homeData() {
  const p = getHomeDataProfile();
  return {
    profile: p,
    topics: p !== "no-listening" && p !== "nothing",
    video: p !== "no-video" && p !== "nothing",
    posts: p === "nothing" ? "none" : p === "few-posts" ? "few" : "rich",
  };
}
