package com.superpower.browser.device;

import java.nio.charset.StandardCharsets;
import java.util.*;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** A bounded connection contract, never a client-supplied Xray configuration. */
final class ProxyOptions {
    static final Set<String> PROTOCOLS=Set.of("http","https","socks5","socks4","socks4a","ssh","ss","ssr","vmess","vless");
    private static final Set<String> KEYS=Set.of("encryption","transportProtocol","protocolParameter","obfs","obfsParameter","vmessUser","vlessUser","tls");
    private static final Set<String> LEGACY=Set.of("encryption","transportProtocol","protocolParameter","obfs","obfsParameter");
    private static final Set<String> CIPHERS=Set.of("none","plain","rc4-md5","aes-128-ctr","aes-192-ctr","aes-256-ctr","aes-128-cfb","aes-192-cfb","aes-256-cfb","aes-128-gcm","aes-192-gcm","aes-256-gcm","chacha20","chacha20-ietf","chacha20-poly1305","chacha20-ietf-poly1305","xchacha20-poly1305","xchacha20-ietf-poly1305","2022-blake3-aes-128-gcm","2022-blake3-aes-256-gcm","2022-blake3-chacha20-poly1305");
    private static final Set<String> SS_CIPHERS=Set.of("none","plain","aes-128-gcm","aes-256-gcm","chacha20-poly1305","chacha20-ietf-poly1305","xchacha20-poly1305","xchacha20-ietf-poly1305","2022-blake3-aes-128-gcm","2022-blake3-aes-256-gcm","2022-blake3-chacha20-poly1305");
    private static final Set<String> SSR_CIPHERS=Set.of("none","rc4-md5","aes-128-ctr","aes-192-ctr","aes-256-ctr","aes-128-cfb","aes-192-cfb","aes-256-cfb","aes-128-gcm","aes-192-gcm","aes-256-gcm","chacha20","chacha20-ietf","chacha20-ietf-poly1305","xchacha20-ietf-poly1305");
    private static final Map<String,String> SSR_CIPHER_ALIASES=Map.of("plain","none","chacha20-poly1305","chacha20-ietf-poly1305","xchacha20-poly1305","xchacha20-ietf-poly1305");
    private static final Set<String> SSR_PROTOCOLS=Set.of("origin","verify_simple","auth_simple","auth_sha1","auth_sha1_v2","auth_sha1_v4","auth_aes128_md5","auth_aes128_sha1","auth_chain_a","auth_chain_b","auth_chain_c","auth_chain_d","auth_chain_e","auth_chain_f");
    private static final Set<String> SSR_OBFS=Set.of("plain","http_simple","http_post","random_head","tls1.2_ticket_auth","tls1.2_ticket_fastauth");
    private static final Set<String> NETWORKS=Set.of("","tcp","ws","grpc","http","h2","httpupgrade","splithttp");
    private ProxyOptions() {}

    /** Retire encrypted legacy routes without discarding protocol-specific credentials. */
    static Map<String,Object> protocolOnly(Map<String,Object> stored) {
        var result=new LinkedHashMap<String,Object>(stored);
        for(String key:List.of("transit","alternatives","resourceProxy","routing"))result.remove(key);
        return result;
    }

    static Map<String,Object> normalize(Map<String,Object> connection) {
        var raw=new LinkedHashMap<>(map(connection.get("proxyOptions"),"proxyOptions"));
        for(String key:LEGACY)if(connection.containsKey(key)&&!text(connection,key).isBlank())raw.put(key,connection.get(key));
        // Serialization is bounded before walking optional connection branches.
        require(json(raw).getBytes(StandardCharsets.UTF_8).length<=65536,400,"代理扩展配置不能超过 64 KiB");
        return options(raw,text(connection,"protocol"),text(connection,"username"),text(connection,"password"));
    }

    private static Map<String,Object> options(Map<String,Object> raw,String protocol,String username,String password) {
        require(PROTOCOLS.contains(protocol),400,"代理协议不支持");
        if(protocol.equals("socks5"))require(username.getBytes(StandardCharsets.UTF_8).length<=255&&password.getBytes(StandardCharsets.UTF_8).length<=255,400,"SOCKS5 账号和密码不能超过 255 字节");
        if(protocol.equals("socks4")||protocol.equals("socks4a"))require(password.isEmpty(),400,"SOCKS4 不支持密码认证");
        allowed(raw,KEYS,"proxyOptions");
        var out=new LinkedHashMap<String,Object>();
        for(String key:LEGACY)putString(raw,out,key,key.endsWith("Parameter")?2048:100);
        if(protocol.equals("ssr")&&out.containsKey("encryption"))out.put("encryption",SSR_CIPHER_ALIASES.getOrDefault(text(out,"encryption"),text(out,"encryption")));
        if(out.containsKey("encryption"))choice(out,"encryption",protocol.equals("ss")?SS_CIPHERS:protocol.equals("ssr")?SSR_CIPHERS:CIPHERS,"加密方法");
        if(out.containsKey("transportProtocol"))choice(out,"transportProtocol",protocol.equals("ss")?Set.of("","tcp"):SSR_PROTOCOLS,"代理传输协议");
        if(out.containsKey("obfs"))choice(out,"obfs",SSR_OBFS,"SSR 混淆方法");
        if(protocol.equals("ss")&&out.containsKey("obfs"))choice(out,"obfs",Set.of("","plain"),"SS 混淆方法");
        if(raw.containsKey("tls")) {
            var tls=map(raw.get("tls"),"tls");allowed(tls,Set.of("serverName","allowInsecure"),"tls");
            var value=new LinkedHashMap<String,Object>();putHost(tls,value,"serverName");
            if(tls.containsKey("allowInsecure")){require(tls.get("allowInsecure") instanceof Boolean,400,"allowInsecure 必须为布尔值");value.put("allowInsecure",tls.get("allowInsecure"));}
            out.put("tls",value);
        }
        if(raw.containsKey("vmessUser")) {
            var user=map(raw.get("vmessUser"),"vmessUser");
            allowed(user,Set.of("id","alterId","security","securityTls","network","serverName","path","host","serviceName"),"vmessUser");
            var value=user(user,Set.of("id","security","network","path","serviceName"));
            if(user.containsKey("alterId")){long alter=integer(user,"alterId",0,65535);value.put("alterId",alter);}
            if(user.containsKey("securityTls")) {
                Object tls=user.get("securityTls");
                if(tls instanceof Boolean enabled)value.put("securityTls",enabled?"tls":"none");
                else {require(tls instanceof String&&Set.of("none","tls","").contains(tls),400,"securityTls 只能为 none 或 tls");value.put("securityTls",tls);}
            }
            if(value.containsKey("security"))choice(value,"security",Set.of("","auto","none","zero","aes-128-gcm","chacha20-poly1305"),"VMess 加密");
            out.put("vmessUser",value);
        }
        if(raw.containsKey("vlessUser")) {
            var user=map(raw.get("vlessUser"),"vlessUser");
            allowed(user,Set.of("id","encryption","flow","network","security","serverName","fingerprint","publicKey","shortId","spiderX","path","host","serviceName"),"vlessUser");
            var value=user(user,Set.of("id","encryption","flow","network","security","fingerprint","publicKey","shortId","spiderX","path","serviceName"));
            if(value.containsKey("encryption"))choice(value,"encryption",Set.of("","none"),"VLESS 加密");
            if(value.containsKey("security"))choice(value,"security",Set.of("","none","tls","reality"),"VLESS 安全类型");
            if(text(value,"security").isEmpty())value.put("security","reality");
            if(value.containsKey("flow"))choice(value,"flow",Set.of("","xtls-rprx-vision","xtls-rprx-vision-udp443"),"VLESS 流控");
            if(value.containsKey("fingerprint"))choice(value,"fingerprint",Set.of("","chrome","firefox","safari","ios","android","edge","360","qq","random","randomized"),"TLS 指纹");
            if(!text(value,"shortId").isEmpty())require(text(value,"shortId").matches("(?:[0-9a-fA-F]{2}){1,8}"),400,"Reality shortId 须为最多 16 位偶数长度十六进制字符");
            if(!text(value,"publicKey").isEmpty())require(text(value,"publicKey").matches("[A-Za-z0-9_-]{43}"),400,"Reality 公钥格式不正确");
            String network=text(value,"network").isEmpty()?"tcp":text(value,"network"),security=text(value,"security");
            if(text(value,"security").equals("reality")) {
                require(!text(value,"serverName").isEmpty()&&!text(value,"publicKey").isEmpty(),400,"Reality 需要填写 SNI 和公钥");
                require(Set.of("tcp","http","h2","grpc").contains(network),400,"Reality 仅支持 TCP、HTTP/2 或 gRPC");
            }
            if(!text(value,"flow").isEmpty())require(network.equals("tcp")&&Set.of("tls","reality").contains(security),400,"VLESS Vision 需要使用 TCP 和 TLS/Reality");
            out.put("vlessUser",value);
        }
        if(protocol.equals("ss")||protocol.equals("ssr"))require(!text(out,"encryption").isBlank()&&!password.isEmpty(),400,"SS/SSR 需要填写加密方法和密码");
        if(protocol.equals("ssh"))require(!username.isBlank(),400,"SSH 代理需要填写用户名");
        if(protocol.equals("vmess")||protocol.equals("vless")) {
            var user=map(out.get(protocol+"User"),protocol+"User");
            require(text(user,"id").matches("(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"),400,protocol.toUpperCase(Locale.ROOT)+" 需要填写合法 UUID");
        }
        return out;
    }

    private static Map<String,Object> user(Map<String,Object> input,Set<String> fields) {
        var value=new LinkedHashMap<String,Object>();
        for(String key:fields)putString(input,value,key,key.equals("path")||key.equals("spiderX")?2048:255);
        putHost(input,value,"serverName");putString(input,value,"host",255);
        if(value.containsKey("host"))value.put("host",ProxySettings.transportHost(text(value,"host")));
        if(value.containsKey("network"))choice(value,"network",NETWORKS,"传输协议");
        return value;
    }
    private static void putHost(Map<String,Object> input,Map<String,Object> out,String key) {
        putString(input,out,key,255);if(!text(out,key).isEmpty())out.put(key,ProxySettings.host(text(out,key)));
    }
    private static void putString(Map<String,Object> input,Map<String,Object> out,String key,int max) {
        if(!input.containsKey(key))return;
        require(input.get(key) instanceof String,400,"代理配置字段必须为文本："+key);
        String value=(String)input.get(key);require(value.length()<=max&&!value.matches("(?s).*[\\x00-\\x1f\\x7f].*"),400,"代理配置字段长度或字符不合法："+key);out.put(key,value);
    }
    private static void choice(Map<String,Object> input,String key,Set<String> choices,String label) {require(choices.contains(text(input,key)),400,label+"不支持");}
    private static long integer(Map<String,Object> input,String key,long min,long max) {
        require(input.get(key) instanceof Number&&text(input,key).matches("[0-9]+"),400,"代理配置字段必须为整数："+key);
        long value=number(input,key);require(value>=min&&value<=max,400,"代理配置字段超出范围："+key);return value;
    }
    private static void allowed(Map<String,Object> input,Set<String> keys,String label) {require(keys.containsAll(input.keySet()),400,label+" 包含不支持的字段");}
    @SuppressWarnings("unchecked") private static Map<String,Object> map(Object input,String label) {
        if(input==null)return Map.of();
        require(input instanceof Map<?,?>,400,label+" 必须为对象");
        var value=(Map<?,?>)input;require(value.size()<=16&&value.keySet().stream().allMatch(String.class::isInstance),400,label+" 字段不合法");return (Map<String,Object>)value;
    }
}
