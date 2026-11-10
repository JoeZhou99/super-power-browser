import type { ProxyConnection, ProxyOptions } from './proxyOptions.mjs';
export const RELAY_PROTOCOLS: string[];
export const MAX_PROXY_ALTERNATIVES: number;
export const MAX_PROXY_DEPTH: number;
export function createProxyConnection(protocol?: string): ProxyConnection;
export function copyProxyConnection(record: {protocol: string; host: string; port: number}, credentials: {username: string; password: string; proxyOptions?: ProxyOptions}, depth?: number, forTransit?: boolean): ProxyConnection;
export function validateProxyRoutes(protocol: string, input: ProxyOptions, depth?: number): ProxyOptions;
export function validateRoutingDomains(domains: string[]): string[];
