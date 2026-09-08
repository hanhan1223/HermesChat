package com.hermes.admin.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 资源不存在异常
 */
@Getter
public class ResourceNotFoundException extends RuntimeException {
    
    private final HttpStatus status = HttpStatus.NOT_FOUND;

    public ResourceNotFoundException(String message) {
        super(message);
    }
}