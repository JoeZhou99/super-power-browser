package com.superpower.browser.shared;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import static com.superpower.browser.shared.BusinessException.require;

/** 店铺和代理密码仅在受权读取连接配置时解密；API 与 Worker 必须使用同一密钥。 */
@Component
public class SecretCipher {
    private final String configuredKey;
    public SecretCipher(@Value("${app.data-key:}") String key) { this.configuredKey=key; }
    private SecretKeySpec key() {
        require(!configuredKey.isBlank(),503,"请先配置 APP_DATA_KEY 后再保存或使用密码");
        try { byte[] key=Base64.getDecoder().decode(configuredKey);require(key.length==32,503,"APP_DATA_KEY 必须是 32 字节密钥的 Base64 编码");return new SecretKeySpec(key,"AES"); }
        catch(IllegalArgumentException e) { throw new BusinessException(503,"APP_DATA_KEY 格式不正确"); }
    }
    public String encrypt(String plaintext) {
        if(plaintext.isEmpty()) return "";
        require(plaintext.getBytes(StandardCharsets.UTF_8).length<=600,400,"密码长度超出支持范围");
        return encryptPayload(plaintext);
    }
    /** Cookie、账号和通行密钥使用同样的认证加密，单个文档限制 2 MiB。 */
    public String encryptPayload(String plaintext) {
        if(plaintext.isEmpty()) return "";
        require(plaintext.getBytes(StandardCharsets.UTF_8).length<=2*1024*1024,413,"插件数据超过 2 MiB");
        try {
            var key=key();byte[] nonce=new byte[12];new SecureRandom().nextBytes(nonce);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key,new GCMParameterSpec(128,nonce));
            return Base64.getEncoder().encodeToString(nonce)+":"+Base64.getEncoder().encodeToString(cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8)));
        } catch(BusinessException e) { throw e; }
        catch(Exception e) { throw new IllegalStateException("密码加密失败",e); }
    }
    public String decrypt(String stored) {
        if(stored.isEmpty()) return "";
        try {
            var key=key();String[] parts=stored.split(":",2);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Base64.getDecoder().decode(parts[0])));
            return new String(cipher.doFinal(Base64.getDecoder().decode(parts[1])),StandardCharsets.UTF_8);
        } catch(BusinessException e) { throw e; }
        catch(Exception e) { throw new BusinessException(503,"无法解密设备或店铺密码，请检查数据密钥"); }
    }
}
