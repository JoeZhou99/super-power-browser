export const BRAND = Object.freeze({
  name: "SuperPower AI",
  agentName: "SuperPower AI",
  clientName: "superpower-browser-ai",
  icon: "GitFork",
})

// Match former default values only; custom assistant names remain unchanged.
const previousDefaultNames = new Set(["智斧", "智斧AI", "智斧 AI", "三叉戟", "盘古", "Zhifu", "Zhifu AI", "Trident"]);
export function normalizeAgentName(value) {
  const name = String(value || "").trim();
  return !name || previousDefaultNames.has(name) ? BRAND.agentName : name;
}
