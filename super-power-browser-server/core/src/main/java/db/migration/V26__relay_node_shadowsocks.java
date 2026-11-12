package db.migration;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Locale;
import java.util.regex.Pattern;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** V23 used an unnamed CHECK, whose generated name differs between MySQL and H2. */
public class V26__relay_node_shadowsocks extends BaseJavaMigration {
    private static final Pattern PROTOCOL_COLUMN=Pattern.compile("\\bprotocol\\b",Pattern.CASE_INSENSITIVE);
    private static final String NEW_CONSTRAINT="relay_node_protocol_supported";

    @Override public void migrate(Context context) throws Exception {
        Connection connection=context.getConnection();
        String product=connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
        boolean mysql=product.equals("mysql");
        if(!mysql&&!product.equals("h2"))throw new SQLException("Relay protocol migration supports MySQL and H2 only");
        String schema=mysql?connection.getCatalog():connection.getSchema();
        String quote=connection.getMetaData().getIdentifierQuoteString().trim();
        if(schema==null||schema.isBlank()||quote.isEmpty())throw new SQLException("Cannot determine the relay schema or identifier quoting");

        record ProtocolConstraint(String name,String table) {}
        var constraints=new ArrayList<ProtocolConstraint>();
        String query="SELECT cc.constraint_name,cc.check_clause,tc.table_name FROM information_schema.check_constraints cc "
            +"JOIN information_schema.table_constraints tc ON tc.constraint_catalog=cc.constraint_catalog "
            +"AND tc.constraint_schema=cc.constraint_schema AND tc.constraint_name=cc.constraint_name "
            +"WHERE tc.table_schema=? AND LOWER(tc.table_name)='relay_node' AND tc.constraint_type='CHECK'";
        try(var statement=connection.prepareStatement(query)) {
            statement.setString(1,schema);
            try(var result=statement.executeQuery()) {
                while(result.next()) {
                    if(PROTOCOL_COLUMN.matcher(result.getString(2)).find())
                        constraints.add(new ProtocolConstraint(result.getString(1),result.getString(3)));
                }
            }
        }
        if(constraints.size()!=1||constraints.get(0).name().equalsIgnoreCase(NEW_CONSTRAINT)) {
            throw new SQLException("Expected the existing V23 relay_node protocol constraint before V26");
        }

        String table=identifier(schema,quote)+"."+identifier(constraints.get(0).table(),quote);
        try(var statement=connection.createStatement()) {
            // Install the replacement before removing the old rule. MySQL DDL is
            // not transactional, so never leave the table without a protocol rule.
            statement.execute("ALTER TABLE "+table+" ADD CONSTRAINT "+identifier(NEW_CONSTRAINT,quote)
                +" CHECK(protocol IN ('http','https','socks5','ss'))");
            statement.execute("ALTER TABLE "+table+(mysql?" DROP CHECK ":" DROP CONSTRAINT ")+identifier(constraints.get(0).name(),quote));
        }
    }

    private static String identifier(String value,String quote) {
        return quote+value.replace(quote,quote+quote)+quote;
    }
}
