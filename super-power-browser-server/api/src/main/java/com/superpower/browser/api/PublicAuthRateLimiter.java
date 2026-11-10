package com.superpower.browser.api;

import java.util.HashMap;
import java.util.Map;
import static com.superpower.browser.shared.BusinessException.require;

/** A bounded per-process guard for public endpoints that perform password hashing. */
final class PublicAuthRateLimiter {
    private record Window(long minute,int count) {}
    private final Map<String,Window> addresses=new HashMap<>();
    private long globalMinute;
    private int globalCount;

    synchronized void check(String operation,String address,int limit) {
        long minute=System.currentTimeMillis()/60_000;
        if(minute!=globalMinute) {
            globalMinute=minute; globalCount=0;
            addresses.entrySet().removeIf(entry->entry.getValue().minute()!=minute);
        }
        String key=operation+":"+address;
        Window window=addresses.get(key);
        int count=window==null||window.minute()!=minute?0:window.count();
        require(count<limit&&globalCount<120,429,"操作过于频繁，请稍后再试");
        addresses.put(key,new Window(minute,count+1)); globalCount++;
    }
}
