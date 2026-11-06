import axios from "axios";
import {token} from "@/utils/request";

function getWecomQcBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_WECOM_QC_API_BASE as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return import.meta.env.VITE_APP_BASE_API + "/llm/openclaw/qc";
}

const wecomQcClient = axios.create({
  baseURL: getWecomQcBaseUrl(),
  timeout: 20000,
});

// 参考 request.ts：统一注入 Bearer Token
wecomQcClient.interceptors.request.use((config) => {
  (config.headers as any).Qcsource = "work_wechat";
  const sessionToken = token();
  if (sessionToken) {
    (config.headers as any).Authorization = `Bearer ${sessionToken}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

/** 与 wecom-openclaw-cli 一致：darwin=1 win32=2 linux=3 其它=0 */
export function wecomPlatFromUserAgent(): number {
  if (typeof navigator === "undefined") return 0;
  const ua = navigator.userAgent;
  if (/Windows|Win32|Win64|WOW64/i.test(ua)) return 2;
  if (/(Mac OS X|Macintosh)/i.test(ua)) return 1;
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 3;
  return 0;
}

export async function wecomQcGenerate(): Promise<{ scode: string; auth_url: string }> {
  const { data } = await wecomQcClient.get("/ai/qc/generate", {
    params: { source: "wecom-cli", plat: wecomPlatFromUserAgent() },
  });
  const scode = data?.data?.scode as string | undefined;
  const auth_url = data?.data?.auth_url as string | undefined;
  if (!scode || !auth_url) {
    throw new Error("获取企业微信二维码失败，响应格式异常");
  }
  return { scode, auth_url };
}

export async function wecomQcQuery(scode: string): Promise<{
  status: string;
  botid?: string;
  secret?: string;
}> {
  const { data } = await wecomQcClient.get("/ai/qc/query_result", {
    params: { scode },
  });
  const status = (data?.data?.status as string | undefined) ?? "";
  const botInfo = data?.data?.bot_info as { botid?: string; secret?: string } | undefined;
  return {
    status,
    botid: botInfo?.botid,
    secret: botInfo?.secret,
  };
}
