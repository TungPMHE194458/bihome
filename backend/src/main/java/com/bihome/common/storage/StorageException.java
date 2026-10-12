package com.bihome.common.storage;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;

public class StorageException extends BusinessException {

    public StorageException(String message, Throwable cause) {
        super(ErrorCode.STORAGE_ERROR, message, cause);
    }

    public StorageException(String message) {
        super(ErrorCode.STORAGE_ERROR, message);
    }
}
