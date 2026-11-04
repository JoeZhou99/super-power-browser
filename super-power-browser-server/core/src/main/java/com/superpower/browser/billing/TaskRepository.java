package com.superpower.browser.billing;

import com.superpower.browser.shared.Db;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Repository;
import static com.superpower.browser.shared.Data.*;

@Repository
class TaskRepository {
    private final Db db;
    TaskRepository(Db db) { this.db=db; }
    Optional<Map<String,Object>> next() {
        return rows(db.select("SELECT * FROM task WHERE (status='PENDING' AND available_at<=CURRENT_TIMESTAMP) OR (status='RUNNING' AND lease_until<CURRENT_TIMESTAMP) ORDER BY available_at LIMIT 1 FOR UPDATE SKIP LOCKED")).stream().findFirst();
    }
    void claim(String id,String owner) { db.execute("UPDATE task SET status='RUNNING',lease_owner=?,lease_until=?,attempts=attempts+1 WHERE id=?",owner,Timestamp.from(Instant.now().plusSeconds(120)),id); }
    Map<String,Object> lock(String id) { return one(db.select("SELECT * FROM task WHERE id=? FOR UPDATE",id)); }
    void complete(String taskId,String orderId) { db.execute("UPDATE task SET status='DONE',lease_until=NULL,error_message=NULL WHERE id=?",taskId); db.execute("UPDATE business_order SET delivery_status='DELIVERED',failure_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",orderId); }
    void failed(Map<String,Object> task,String message) {
        boolean exhausted=number(task,"attempts")>=5;
        db.execute("UPDATE task SET status=?,available_at=?,lease_until=NULL,error_message=? WHERE id=?",exhausted?"FAILED":"PENDING",Timestamp.from(Instant.now().plusSeconds(60)),message,text(task,"id"));
        db.execute("UPDATE business_order SET delivery_status=?,failure_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",exhausted?"FAILED":"PENDING",message,text(task,"orderId"));
    }
    void processing(String id) { db.execute("UPDATE business_order SET delivery_status='PROCESSING',updated_at=CURRENT_TIMESTAMP WHERE id=?",id); }
    List<Map<String,Object>> pendingPayments() { return rows(db.select("SELECT id,channel FROM business_order WHERE channel<>'balance' AND payment_status<>'PAID' AND created_at>? ORDER BY created_at LIMIT 100",Timestamp.from(Instant.now().minusSeconds(86400*7)))); }
}
