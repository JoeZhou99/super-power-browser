package com.superpower.browser.device;

import com.superpower.browser.shared.BusinessException;
import java.net.*;
import java.time.Instant;
import java.util.Locale;
import static com.superpower.browser.shared.BusinessException.require;

/** Connection addresses are parsed locally; saving a proxy never performs DNS or HTTP requests. */
final class ProxySettings {
    private ProxySettings() {}
    static String host(String value) {
        String host=value.trim();
        if(host.startsWith("[")&&host.endsWith("]"))host=host.substring(1,host.length()-1);
        require(!host.isEmpty()&&host.length()<=255&&!host.matches(".*[\\s/@?#%\\\\].*"),400,"代理主机地址不合法");
        try {
            if(host.contains(":")) {
                require(host.matches("[0-9a-fA-F:.]+"),400,"IPv6 地址不合法");
                InetAddress parsed=InetAddress.getByName(host);
                require(parsed instanceof Inet6Address,400,"IPv6 地址不合法");
                return parsed.getHostAddress().toLowerCase(Locale.ROOT);
            }
            if(host.matches("[0-9.]+")) {
                String[] parts=host.split("\\.",-1);require(parts.length==4,400,"IPv4 地址不合法");
                for(int i=0;i<parts.length;i++) {
                    require(parts[i].matches("[0-9]{1,3}"),400,"IPv4 地址不合法");
                    int part=Integer.parseInt(parts[i]);require(part<=255,400,"IPv4 地址不合法");parts[i]=Integer.toString(part);
                }
                return String.join(".",parts);
            }
            if(host.endsWith("."))host=host.substring(0,host.length()-1);
            host=IDN.toASCII(host,IDN.USE_STD3_ASCII_RULES).toLowerCase(Locale.ROOT);
            require(host.length()<=253,400,"代理域名过长");
            for(String label:host.split("\\.",-1))require(label.matches("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"),400,"代理域名不合法");
            return host;
        } catch(IllegalArgumentException|UnknownHostException error) { throw new BusinessException(400,"代理主机地址不合法"); }
    }
    static String ip(String value) {
        if(value.isBlank())return "";
        String result=host(value);require(result.contains(":")||result.matches("[0-9]+(?:\\.[0-9]+){3}"),400,"检测结果必须是 IP 地址");return result;
    }
    static String changeUrl(String value) {
        String result=value.trim();if(result.isEmpty())return result;
        require(result.getBytes(java.nio.charset.StandardCharsets.UTF_8).length<=2000,400,"换 IP 链接最多 2000 字节");
        try {
            URI uri=URI.create(result);
            require(("https".equalsIgnoreCase(uri.getScheme())||"http".equalsIgnoreCase(uri.getScheme()))&&uri.getHost()!=null&&uri.getUserInfo()==null&&uri.getFragment()==null,400,"换 IP 链接必须是完整的 HTTP 或 HTTPS 地址");
            require(uri.getPort()==-1||uri.getPort()>0&&uri.getPort()<=65535,400,"换 IP 链接端口不合法");
            return result;
        } catch(IllegalArgumentException error) { throw new BusinessException(400,"换 IP 链接不合法"); }
    }
    static Instant expiry(String value) {
        if(value.isBlank())return null;
        try { return Instant.parse(value); }
        catch(java.time.format.DateTimeParseException error) { throw new BusinessException(400,"到期时间必须是 ISO 日期时间"); }
    }
}
