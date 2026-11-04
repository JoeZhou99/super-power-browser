package com.superpower.browser.api;

import com.superpower.browser.shared.BusinessException;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class Errors {
    @ExceptionHandler(BusinessException.class) ResponseEntity<?> business(BusinessException e) { return ResponseEntity.status(e.status).body(Map.of("message",e.getMessage())); }
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict(DataIntegrityViolationException e) { return ResponseEntity.status(409).body(Map.of("message","记录重复、字段超限或仍被其他数据引用")); }
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> invalid(IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message","请求格式不正确")); }
}
