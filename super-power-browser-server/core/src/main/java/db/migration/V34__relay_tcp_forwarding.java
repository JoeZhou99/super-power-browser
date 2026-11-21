package db.migration;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Locale;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** TCP nodes are transparent, exit-bound port forwards rather than independent proxies. */
public class V34__relay_tcp_forwarding extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        Connection connection=context.getConnection();
        String product=connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
        boolean mysql=product.equals("mysql");
        if(!mysql&&!product.equals("h2"))throw new SQLException("Relay TCP migration supports MySQL and H2 only");
        String schema=mysql?connection.getCatalog():connection.getSchema();
        String quote=connection.getMetaData().getIdentifierQuoteString().trim();
        if(schema==null||schema.isBlank()||quote.isEmpty())throw new SQLException("Cannot determine the relay schema or identifier quoting");
        String table=null,constraint=null;
        try(var statement=connection.prepareStatement("SELECT table_name,constraint_name FROM information_schema.table_constraints "
            +"WHERE table_schema=? AND LOWER(table_name)='relay_node' AND LOWER(constraint_name)='relay_node_protocol_v27' AND constraint_type='CHECK'")) {
            statement.setString(1,schema);
            try(var rows=statement.executeQuery()) {
                if(rows.next()){table=rows.getString(1);constraint=rows.getString(2);}
                if(table==null||rows.next())throw new SQLException("Expected the V27 relay_node protocol constraint before V34");
            }
        }
        String qualified=identifier(schema,quote)+"."+identifier(table,quote);
        String add="ADD CONSTRAINT "+identifier("relay_node_protocol_v34",quote)
            +" CHECK(CASE protocol WHEN 'http' THEN 1 WHEN 'https' THEN 1 WHEN 'socks5' THEN 1 WHEN 'ss' THEN 1 WHEN 'tcp' THEN 1 ELSE 0 END=1)";
        try(var statement=connection.createStatement()) {
            if(mysql) {
                // MySQL accepts both changes in one ALTER, so the old CHECK cannot reject TCP afterward.
                statement.execute("ALTER TABLE "+qualified+" DROP CHECK "+identifier(constraint,quote)+", "+add);
            } else {
                statement.execute("ALTER TABLE "+qualified+" DROP CONSTRAINT "+identifier(constraint,quote));
                statement.execute("ALTER TABLE "+qualified+" "+add);
            }
        }
    }
    private static String identifier(String value,String quote) {return quote+value.replace(quote,quote+quote)+quote;}
}
