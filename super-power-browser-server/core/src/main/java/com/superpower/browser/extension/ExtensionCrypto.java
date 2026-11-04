package com.superpower.browser.extension;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import com.superpower.browser.shared.BusinessException;

/** Legacy wire encoding only. Database encryption uses SecretCipher and APP_DATA_KEY. */
public final class ExtensionCrypto {
    private ExtensionCrypto() {}
    public static String encode(String value) { return transform(value,true); }
    public static String decode(String value) { return transform(value,false); }
    private static String transform(String value,boolean encode) {
        try {
            var cipher=Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(encode?Cipher.ENCRYPT_MODE:Cipher.DECRYPT_MODE,new SecretKeySpec("c4n0lFdTM39TTYjH".getBytes(StandardCharsets.UTF_8),"AES"),new IvParameterSpec("sn7TwyGuU7kJWEAp".getBytes(StandardCharsets.UTF_8)));
            byte[] result=cipher.doFinal(encode?value.getBytes(StandardCharsets.UTF_8):Base64.getDecoder().decode(value));
            return encode?Base64.getEncoder().encodeToString(result):new String(result,StandardCharsets.UTF_8);
        } catch(Exception e) {throw new BusinessException(400,"插件传输数据格式错误");}
    }
}
