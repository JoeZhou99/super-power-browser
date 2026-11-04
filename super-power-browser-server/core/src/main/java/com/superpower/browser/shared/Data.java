package com.superpower.browser.shared;

import java.util.*;
import tools.jackson.databind.json.JsonMapper;
import static com.superpower.browser.shared.BusinessException.require;

public final class Data {
    private Data() {}
    public static final JsonMapper JSON = JsonMapper.builder().build();
    public static String id() { return UUID.randomUUID().toString(); }
    public static String text(Map<String,?> map, String key) { return Objects.toString(map.get(key), ""); }
    public static String required(Map<String,?> map, String key, int max) {
        String value=text(map,key).trim(); require(!value.isEmpty() && value.length()<=max,400,"字段不合法："+key); return value;
    }
    public static long number(Map<String,?> map, String key) {
        try { return Long.parseLong(text(map,key)); } catch(NumberFormatException e) { throw new BusinessException(400,"数值不合法："+key); }
    }
    public static boolean flag(Map<String,?> map, String key) { return Boolean.TRUE.equals(map.get(key)) || "1".equals(text(map,key)); }
    public static Map<String,Object> row(Map<String,Object> input) {
        Map<String,Object> output=new LinkedHashMap<>();
        input.forEach((key,value)->{
            String[] parts=key.toLowerCase(Locale.ROOT).split("_");
            StringBuilder name=new StringBuilder(parts[0]);
            for(int i=1;i<parts.length;i++) name.append(Character.toUpperCase(parts[i].charAt(0))).append(parts[i].substring(1));
            output.put(name.toString(), value instanceof java.sql.Timestamp t ? t.toInstant().toString() : value);
        }); return output;
    }
    public static List<Map<String,Object>> rows(List<Map<String,Object>> input) { return input.stream().map(Data::row).toList(); }
    public static Map<String,Object> one(List<Map<String,Object>> input) {
        require(!input.isEmpty(),404,"记录不存在或无权访问"); return row(input.get(0));
    }
    public static String json(Object value) { return JSON.writeValueAsString(value); }
    @SuppressWarnings("unchecked")
    public static Map<String,Object> object(String value) { return JSON.readValue(value,Map.class); }
    public static List<String> strings(Map<String,?> map,String key) {
        Object value=map.get(key); require(value instanceof List<?>,400,"列表不合法："+key);
        return ((List<?>)value).stream().map(Object::toString).distinct().toList();
    }
}
