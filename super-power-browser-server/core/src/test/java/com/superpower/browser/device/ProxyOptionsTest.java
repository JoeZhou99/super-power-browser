package com.superpower.browser.device;

import com.superpower.browser.shared.BusinessException;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ProxyOptionsTest {
    private Map<String,Object> normalize(String protocol,Map<String,Object> options) {
        return ProxyOptions.normalize(Map.of("protocol",protocol,"username","synthetic-user","password","synthetic-password","proxyOptions",options));
    }
    private Map<String,Object> connection(Map<String,Object> options) { return Map.of("protocol","https","host","proxy.example.com","port",443,"username","user","password","synthetic-secret","proxyOptions",options); }
    @Test void transportHostRetainsPortAndIpv6WithoutWeakeningTlsServerName() {
        for(String protocol:List.of("vmess","vless"))for(String host:List.of("CDN.Example.com:8443","[2001:db8::1]:443","[2001:db8::1]","cdn.example.com")) {
            var options=normalize(protocol,Map.of(protocol+"User",Map.of("id","11111111-2222-3333-4444-555555555555","security","none","network","ws","host",host)));
            var user=(Map<?,?>)options.get(protocol+"User");String result=(String)user.get("host");
            if(host.startsWith("["))assertTrue(result.startsWith("[2001:db8:"));else assertEquals(host.toLowerCase(Locale.ROOT),result);
            if(host.contains("]:"))assertTrue(result.endsWith(":443"));
        }
        for(String host:List.of("example.com:0","example.com:65536","example.com:","example.com/path","user:secret@example.com","http://example.com","2001:db8::1","[example.com]:443","example.com\r\nX: secret"))assertThrows(BusinessException.class,()->ProxySettings.transportHost(host));
        assertThrows(BusinessException.class,()->normalize("https",Map.of("tls",Map.of("serverName","example.com:443"))));
    }
    @Test void ssrMethodsMatchPinnedHelperAndCanonicalizeExistingAliases() {
        for(var alias:Map.of("plain","none","chacha20-poly1305","chacha20-ietf-poly1305","xchacha20-poly1305","xchacha20-ietf-poly1305").entrySet())assertEquals(alias.getValue(),normalize("ssr",Map.of("encryption",alias.getKey())).get("encryption"));
        for(String method:List.of("aes-128-ctr","aes-256-cfb","aes-192-gcm","chacha20-ietf-poly1305","xchacha20-ietf-poly1305","none"))assertEquals(method,normalize("ssr",Map.of("encryption",method)).get("encryption"));
        for(String method:List.of("2022-blake3-aes-128-gcm","2022-blake3-aes-256-gcm","2022-blake3-chacha20-poly1305")) {
            assertThrows(BusinessException.class,()->normalize("ssr",Map.of("encryption",method)));
            assertEquals(method,normalize("ss",Map.of("encryption",method)).get("encryption"));
        }
    }
    @Test void userRoutingFieldsAreRetiredRatherThanHidden() {
        for(String key:List.of("transit","alternatives","resourceProxy","routing"))
            assertThrows(BusinessException.class,()->normalize("http",Map.of(key,Map.of())));
        var old=new LinkedHashMap<String,Object>(Map.of("tls",Map.of("serverName","proxy.example.com"),"transit",connection(Map.of()),"alternatives",List.of(connection(Map.of())),"resourceProxy",connection(Map.of()),"routing",Map.of()));
        assertEquals(Map.of("tls",Map.of("serverName","proxy.example.com")),ProxyOptions.protocolOnly(old));
        assertTrue(old.containsKey("transit"));
    }
}
