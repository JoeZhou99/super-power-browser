package com.superpower.browser.device;

import com.superpower.browser.auth.Actor;
import java.util.Map;

/** 店铺域依赖的设备能力；不暴露设备仓储或更新 SQL。 */
public interface DeviceAccess {
    void requireBindable(Actor actor, String deviceId);
    Map<String,Object> launchProxy(Actor actor, String deviceId);
}
