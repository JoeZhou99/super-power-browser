package com.superpower.browser.shared;

import java.util.*;
import org.apache.ibatis.annotations.*;

/** SQL 由业务模块内的常量构造，所有外部值均通过 args 绑定。 */
@Mapper
public interface Db {
    @SelectProvider(type=Sql.class, method="statement")
    List<Map<String,Object>> select(@Param("sql") String sql, @Param("args") Object... args);
    @UpdateProvider(type=Sql.class, method="statement")
    int execute(@Param("sql") String sql, @Param("args") Object... args);
    class Sql {
        public static String statement(Map<String,Object> params) {
            String sql = (String) params.get("sql");
            int index = 0;
            StringBuilder result = new StringBuilder();
            for (char c : sql.toCharArray()) {
                if(c == '?') result.append("#{args[").append(index++).append("]}");
                else result.append(c);
            }
            return result.toString();
        }
    }
}
