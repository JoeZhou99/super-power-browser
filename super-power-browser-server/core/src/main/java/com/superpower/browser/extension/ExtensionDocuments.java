package com.superpower.browser.extension;

import com.superpower.browser.shared.*;
import java.util.*;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Repository
public class ExtensionDocuments {
    private final Db db;private final SecretCipher cipher;
    public ExtensionDocuments(Db db,SecretCipher cipher) {this.db=db;this.cipher=cipher;}
    public Object get(String env,String collection,String id,Object fallback) {
        var found=rows(db.select("SELECT payload FROM extension_document WHERE environment_id=? AND collection_name=? AND document_id=?",env,collection,id));
        return found.isEmpty()?fallback:JSON.readValue(cipher.decrypt(text(found.get(0),"payload")),Object.class);
    }
    public List<Object> list(String env,String collection) {
        return rows(db.select("SELECT payload FROM extension_document WHERE environment_id=? AND collection_name=? ORDER BY updated_at,document_id LIMIT 1000",env,collection)).stream().map(r->JSON.readValue(cipher.decrypt(text(r,"payload")),Object.class)).toList();
    }
    @Transactional public void put(String env,String collection,String id,Object value) {
        require(id.length()<=100 && !id.isBlank(),400,"插件记录编号不合法");
        // Serialize writes per environment; also prevents insert races on MySQL and H2.
        one(db.select("SELECT id FROM environment WHERE id=? FOR UPDATE",env));
        String encrypted=cipher.encryptPayload(json(value));
        if(db.execute("UPDATE extension_document SET payload=?,updated_at=CURRENT_TIMESTAMP WHERE environment_id=? AND collection_name=? AND document_id=?",encrypted,env,collection,id)==0)
            db.execute("INSERT INTO extension_document(environment_id,collection_name,document_id,payload) VALUES(?,?,?,?)",env,collection,id,encrypted);
    }
    public void remove(String env,String collection,String id) {
        require(db.execute("DELETE FROM extension_document WHERE environment_id=? AND collection_name=? AND document_id=?",env,collection,id)==1,404,"插件记录不存在");
    }
}
