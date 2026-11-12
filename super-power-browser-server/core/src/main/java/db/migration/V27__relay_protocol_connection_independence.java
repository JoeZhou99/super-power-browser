package db.migration;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Locale;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** H2's constant-set IN expression retains the migration session after its pool closes. */
public class V27__relay_protocol_connection_independence extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        Connection connection=context.getConnection();
        String product=connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
        boolean mysql=product.equals("mysql");
        if(!mysql&&!product.equals("h2"))throw new SQLException("Relay protocol migration supports MySQL and H2 only");
        String schema=mysql?connection.getCatalog():connection.getSchema();
        String quote=connection.getMetaData().getIdentifierQuoteString().trim();
        if(schema==null||schema.isBlank()||quote.isEmpty())throw new SQLException("Cannot determine the relay schema or identifier quoting");
        String table=null,constraint=null;
        try(var statement=connection.prepareStatement("SELECT table_name,constraint_name FROM information_schema.table_constraints "
            +"WHERE table_schema=? AND LOWER(table_name)='relay_node' AND LOWER(constraint_name)='relay_node_protocol_supported' AND constraint_type='CHECK'")) {
            statement.setString(1,schema);
            try(var result=statement.executeQuery()) {
                if(result.next()){table=result.getString(1);constraint=result.getString(2);}
                if(table==null||result.next())throw new SQLException("Expected the V26 relay_node protocol constraint before V27");
            }
        }
        String qualified=identifier(schema,quote)+"."+identifier(table,quote);
        try(var statement=connection.createStatement()) {
            // Preserve enforcement during MySQL's non-transactional DDL. CASE
            // performs direct comparisons without H2's closed-session IN cache.
            statement.execute("ALTER TABLE "+qualified+" ADD CONSTRAINT "+identifier("relay_node_protocol_v27",quote)
                +" CHECK(CASE protocol WHEN 'http' THEN 1 WHEN 'https' THEN 1 WHEN 'socks5' THEN 1 WHEN 'ss' THEN 1 ELSE 0 END=1)");
            statement.execute("ALTER TABLE "+qualified+(mysql?" DROP CHECK ":" DROP CONSTRAINT ")+identifier(constraint,quote));
        }
    }
    private static String identifier(String value,String quote) {return quote+value.replace(quote,quote+quote)+quote;}
}
