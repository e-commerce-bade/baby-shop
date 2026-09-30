package com.babyshop.common.exception;

import java.time.OffsetDateTime;
import java.util.List;

public record StockConflictResponse(
        String message,
        int status,
        OffsetDateTime timestamp,
        List<StockConflictException.StockConflict> conflicts
) {
}
