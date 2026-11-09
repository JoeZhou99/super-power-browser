export type ProxyProtocol = 'http' | 'https' | 'socks5' | 'ssh';
export interface ParsedProxy {
  name: string; host: string; port: number; protocol: ProxyProtocol;
  username: string; password: string; remark: string; changeIpUrl: string;
}
export interface ProxyImportRow { line: number; proxy?: ParsedProxy; error: string }
export const PROXY_PROTOCOLS: ProxyProtocol[];
export const MAX_PROXY_IMPORT: number;
export function validateProxyAddress(host: string, port: string | number | undefined): {host: string; port: number};
export function validateChangeIpUrl(value: string): string;
export function parseProxyLine(line: string, defaultProtocol?: string): ParsedProxy;
export function parseProxyImport(text: string, defaultProtocol?: string): {rows: ProxyImportRow[]; total: number; error: string};
