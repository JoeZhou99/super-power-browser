package com.superpower.browser.shared;

public class BusinessException extends RuntimeException {
    public final int status;
    public final String code;
    public BusinessException(int status, String message) { this(status,"BUSINESS_ERROR",message); }
    public BusinessException(int status, String code, String message) { super(message); this.status=status; this.code=code; }
    public static void require(boolean condition, int status, String message) {
        if (!condition) throw new BusinessException(status,message);
    }
}
