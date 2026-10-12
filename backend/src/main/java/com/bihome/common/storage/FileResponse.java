package com.bihome.common.storage;

public record FileResponse(Long id, String name, long size, String contentType, String url) {
}
