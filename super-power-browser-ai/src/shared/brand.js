export const BRAND = Object.freeze({
  name: "SuperPower AI",
  agentName: "SuperPower AI",
  clientName: "superpower-browser-ai",
  icon: "GitFork",
})

export function normalizeAgentName(value) {
  const name = String(value || "").trim();
  return name || BRAND.agentName;
}
