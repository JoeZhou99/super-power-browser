package com.superpower.browser.api;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public catalogue used by the desktop recommendation page. Keep the links reviewable and replaceable in one place. */
@RestController
@RequestMapping("/api")
public class ProxyRecommendationController {
    @GetMapping("/proxy-recommendations")
    Object recommendations() {
        return Map.of("items", List.of(
            Map.of("id","91http","name","91http代理","type","domestic","description","高匿纯净的动态短效与长效静态 IP，适合店铺日常运营。","highlights",List.of("5000万日活 IP 池","380+ 城市线路","注册 0 元试用"),"url","https://www.91http.com","tone","blue"),
            Map.of("id","juliang","name","巨量HTTP","type","domestic","description","高质量动态、静态住宅 IP，提供稳定的 API 接入与并发提取。","highlights",List.of("7000万高品质 IP","不限 IP 提取","API / SDK 完整"),"url","https://www.julianghttp.com","tone","green"),
            Map.of("id","huasheng","name","花生HTTP","type","overseas","description","支持 Socks5、HTTP、HTTPS 的全球线路，自动去重并按需切换。","highlights",List.of("全球省市自选","支持多协议","无并发限制"),"url","https://www.hsp168.com","tone","orange")
        ));
    }
}
