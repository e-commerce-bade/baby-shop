package com.babyshop.notification;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
        // E-posta yalnizca acikca etkinlestirilince ve kimlik bilgileri ayarliyken gonderilir.
        boolean enabled,
        String from,
        String storeName,
        String trackBaseUrl
) {
}
