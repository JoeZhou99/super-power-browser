package com.superpower.browser.ai;

import com.superpower.browser.shared.Db;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;

@Service
public class AiIds {
    private final Db db;
    public AiIds(Db db) {this.db=db;}
    @Transactional public long next() {
        long value=number(one(db.select("SELECT next_id FROM ai_sequence WHERE id=1 FOR UPDATE")),"nextId");
        db.execute("UPDATE ai_sequence SET next_id=? WHERE id=1",Math.addExact(value,1));
        return value;
    }
}
