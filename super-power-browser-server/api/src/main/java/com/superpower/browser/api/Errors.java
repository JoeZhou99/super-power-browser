package com.superpower.browser.api;

import com.superpower.browser.shared.BusinessException;
import java.util.Map;
import java.sql.SQLException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class Errors {
    private static final Logger log=LoggerFactory.getLogger(Errors.class);
    @ExceptionHandler(BusinessException.class) ResponseEntity<?> business(BusinessException e) { return ResponseEntity.status(e.status).body(Map.of("message",e.getMessage())); }
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict(DataIntegrityViolationException e,HttpServletRequest request) {
        // Database exception messages can contain SQL values, including credentials.
        Throwable cause=e.getMostSpecificCause();
        if(cause instanceof SQLException sql)log.warn("Database constraint conflict: {} {}, SQLState={}, errorCode={}",request.getMethod(),request.getRequestURI(),sql.getSQLState(),sql.getErrorCode());
        else log.warn("Database constraint conflict: {} {}, cause={}",request.getMethod(),request.getRequestURI(),cause.getClass().getSimpleName());
        return ResponseEntity.status(409).body(Map.of("message","记录重复、字段超限或仍被其他数据引用"));
    }
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> invalid(IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message","请求格式不正确")); }
}
