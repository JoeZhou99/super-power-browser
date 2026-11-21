import type { ModelProviderOption, UserModelImportedInput } from "@/ai/api/modelManage";
import type { ApiProtocol } from "@/ai/api/superpowerAgent";

export const OWN_MODEL_PROTOCOLS = [
  { value: "chat", label: "Chat Completions" },
  { value: "responses", label: "Responses API" },
] as const;

export function ownModelProtocol(value: unknown): ApiProtocol {
  return String(value || "").trim().toLowerCase() === "responses" ? "responses" : "chat";
}

/** Older imported models may store a provider's display name instead of its code. */
export function findModelProvider(value: string, options: ModelProviderOption[]) {
  return options.find((item) => item.code === value || item.name === value);
}

export function modelProviderLabel(value: string, options: ModelProviderOption[]) {
  return findModelProvider(value, options)?.name || value;
}

/** Send only the fields used to identify and call the imported model. */
export function ownModelPayload(form: UserModelImportedInput): UserModelImportedInput {
  return {
    providerName: form.providerName.trim(),
    modelName: form.modelName.trim(),
    apiKey: form.apiKey.trim(),
    apiProtocol: ownModelProtocol(form.apiProtocol),
    apiUrl: form.apiUrl.trim(),
    custom_name: form.custom_name.trim(),
  };
}
