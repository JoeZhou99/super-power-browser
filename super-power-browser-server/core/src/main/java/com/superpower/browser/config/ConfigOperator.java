package com.superpower.browser.config;

/** A platform operator is never a tenant Actor and cannot use tenant APIs. */
public record ConfigOperator(String id,String username) {}
