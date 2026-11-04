package com.superpower.browser.device;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.BusinessException;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class DeviceImportService {
    private final DeviceService devices;
    public DeviceImportService(DeviceService devices){this.devices=devices;}
    // Each call crosses the DeviceService transaction boundary. Invalid rows do
    // not roll back successful rows, matching the legacy upload result contract.
    public Map<String,Object> importBatch(Actor actor,List<Map<String,Object>> rows){
        actor.allow("device.edit");require(!rows.isEmpty()&&rows.size()<=30,400,"每批请提交 1—30 台设备");
        var errors=new ArrayList<Map<String,Object>>();var ids=new ArrayList<String>();int index=0;
        for(var row:rows){
            index++;
            try{ids.add(devices.importOwnRow(actor,row));}
            catch(BusinessException error){errors.add(Map.of("index",index,"message",error.getMessage()));}
        }
        return Map.of("successCount",ids.size(),"errorCount",errors.size(),"errorMsgData",errors,"ids",ids);
    }
}
