package com.superpower.browser.runtime;

import com.superpower.browser.shared.BusinessException;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** TODO(runtime-replacement): 取得内核、原生库和插件权限后替换本适配器。
 * 旧接口白名单只有内核凭据和内核清单，禁止代理旧店铺、设备、成员、费用接口。
 */
@Component
public class LegacyRuntimeAdapter {
    private final URI base;
    private final String token,key,iv;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    public LegacyRuntimeAdapter(@Value("${app.legacy.base-url}") String base,@Value("${app.legacy.token}") String token,
        @Value("${app.legacy.encryption-key}") String key,@Value("${app.legacy.encryption-iv}") String iv) {
        this.base=base.isBlank()?null:URI.create(base);this.token=token;this.key=key;this.iv=iv;
    }
    public Object credential() { return read("/api/v1/system/getCoreToken?get_new=0"); }
    public Object kernels() { return read("/api/v1/sundry/getInfoByKey?key=chromium_list_v5"); }
    private Object read(String path) {
        require(base!=null,503,"内核运行资源服务尚未配置");
        require("https".equals(base.getScheme()),503,"内核运行资源服务必须使用 HTTPS");
        var builder=HttpRequest.newBuilder(base.resolve(path)).timeout(Duration.ofSeconds(30)).GET();
        if(!token.isBlank()) builder.header("Authorization","Bearer "+token);
        try {
            var response=http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
            require(response.statusCode()==200,502,"旧内核运行资源接口请求失败");
            var envelope=object(response.body());
            require(number(envelope,"errorCode")==0,502,"旧内核运行资源接口拒绝请求");
            Object data=envelope.get("data");
            if(data instanceof String encrypted) {
                Cipher cipher=Cipher.getInstance("AES/CBC/PKCS5Padding");
                cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8),"AES"),new IvParameterSpec(iv.getBytes(StandardCharsets.UTF_8)));
                data=JSON.readValue(new String(cipher.doFinal(Base64.getDecoder().decode(encrypted)),StandardCharsets.UTF_8),Object.class);
                // 旧 core token 以 JSON 字符串包裹 JSON 对象；内核列表直接返回对象。
                if(data instanceof String nested) data=JSON.readValue(nested,Object.class);
            }
            return data;
        } catch(InterruptedException e) { Thread.currentThread().interrupt();throw new BusinessException(502,"内核资源请求已中断"); }
        catch(BusinessException e) { throw e; }
        catch(Exception e) { throw new BusinessException(502,"无法获取或解码内核运行资源，请检查旧接口适配配置"); }
    }
}
