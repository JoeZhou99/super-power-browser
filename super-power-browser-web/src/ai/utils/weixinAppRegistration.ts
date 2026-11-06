import axios from "axios";
import {token} from "@/utils/request";

function getWeixinApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_WECHAT_BOT_API_BASE as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return import.meta.env.VITE_APP_BASE_API + "/llm/openclaw/qc";
}

const weixinClient = axios.create({
  baseURL: getWeixinApiBaseUrl(),
  timeout: 15000,
});

// 参考 request.ts：统一注入 Bearer Token
weixinClient.interceptors.request.use((config) => {
  (config.headers as any).Qcsource = "wechat";
  const sessionToken = token();
  if (sessionToken) {
    (config.headers as any).Authorization = `Bearer ${sessionToken}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

export async function weixinLoginQrStart(botType = "3"): Promise<{
  qrcode: string;
  qrcode_img_content: string;
}> {
  const { data } = await weixinClient.get("/ilink/bot/get_bot_qrcode", {
    params: { bot_type: botType },
  });
  return data;
}

export async function weixinLoginQrPoll(qrcode: string): Promise<{
  status: "wait" | "scaned" | "confirmed" | "expired";
  bot_token?: string;
  ilink_bot_id?: string;
  baseurl?: string;
  ilink_user_id?: string;
}> {
  const { data } = await weixinClient.get("/ilink/bot/get_qrcode_status", {
    params: { qrcode },
    // headers: {
    //   "iLink-App-ClientVersion": "1",
    // },
  });
  return data;
}
