package com.bihome.common.exception;

import java.net.URI;
import org.springframework.http.ProblemDetail;

public final class ProblemDetails {

    private ProblemDetails() {
    }

    public static ProblemDetail of(ErrorCode code, String detail) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(code.getStatus(), detail);
        pd.setType(URI.create("urn:bihome:error:" + code.name().toLowerCase().replace('_', '-')));
        pd.setTitle(code.getStatus().getReasonPhrase());
        pd.setProperty("code", code.name());
        return pd;
    }

    public static ProblemDetail of(ErrorCode code) {
        return of(code, code.getDefaultMessage());
    }
}
