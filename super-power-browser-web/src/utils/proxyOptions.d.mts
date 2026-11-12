export interface ProxyTransportUser {
  id: string; network: string; serverName: string; path: string; host: string; serviceName: string;
}
export interface VmessUser extends ProxyTransportUser { alterId: number; security: string; securityTls: string }
export interface VlessUser extends ProxyTransportUser { encryption: string; flow: string; security: string; fingerprint: string; publicKey: string; shortId: string; spiderX: string }
export interface ProxyOptions {
  encryption?: string; transportProtocol?: string; protocolParameter?: string; obfs?: string; obfsParameter?: string;
  tls?: {serverName: string; allowInsecure: boolean}; vmessUser?: VmessUser; vlessUser?: VlessUser;
}
export const SS_METHODS: string[];
export const SSR_METHODS: string[];
export const SSR_PROTOCOLS: string[];
export const SSR_OBFS: string[];
export const TRANSPORTS: string[];
export function validateTransportHost(value?: string): string;
export function prepareProxyOptions(protocol: string, saved?: ProxyOptions, changingProtocol?: boolean): ProxyOptions;
export function validateProxyOptions(protocol: string, input: ProxyOptions, password?: string): ProxyOptions;
