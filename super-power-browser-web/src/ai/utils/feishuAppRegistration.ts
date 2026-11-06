import axios from "axios";
import {token} from "@/utils/request";

/** 与 lark-open-feishu-plugin-onboard-cli 中 FeishuAuth 一致 */
function getAccountsBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_FEISHU_ACCOUNTS_BASE as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return import.meta.env.VITE_APP_BASE_API + "/llm/openclaw/qc";
}

const feishuAccountsClient = axios.create({
  baseURL: getAccountsBaseUrl(),
  timeout: 15000,
});

// 参考 request.ts：统一注入 Bearer Token
feishuAccountsClient.interceptors.request.use((config) => {
  (config.headers as any)["Content-Type"] = "application/x-www-form-urlencoded";
  (config.headers as any).Qcsource = "feishu";
  const sessionToken = token();
  if (sessionToken) {
    (config.headers as any).Authorization = `Bearer ${sessionToken}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

export async function feishuRegistrationInit(): Promise<{ supported_auth_methods?: string[] }> {
  const { data } = await feishuAccountsClient.post(
    "/oauth/v1/app/registration",
    new URLSearchParams({ action: "init" }).toString()
  );
  return data;
}

export async function feishuRegistrationBegin(): Promise<{
  verification_uri_complete: string;
  device_code: string;
  interval?: number;
  expire_in?: number;
}> {
  const { data } = await feishuAccountsClient.post(
    "/oauth/v1/app/registration",
    new URLSearchParams({
      action: "begin",
      archetype: "PersonalAgent",
      auth_method: "client_secret",
      request_user_info: "open_id",
    }).toString()
  );
  return data;
}

export async function feishuRegistrationPoll(deviceCode: string): Promise<Record<string, unknown>> {
  try {
    const { data } = await feishuAccountsClient.post(
      "/oauth/v1/app/registration",
      new URLSearchParams({ action: "poll", device_code: deviceCode }).toString()
    );
    return data as Record<string, unknown>;
  } catch (e: unknown) {
    const err = e as { response?: { data?: Record<string, unknown> } };
    if (err?.response?.data) return err.response.data;
    throw e;
  }
}
