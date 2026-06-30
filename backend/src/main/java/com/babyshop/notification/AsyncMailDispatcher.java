package com.babyshop.notification;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

// E-postayi ayri bir is parcaciginda gonderir; boylece odeme callback'ini bloklamaz. Yalnizca duz
// String'ler alir (JPA lazy alanlarina dokunmaz). Saglayiciya gore (smtp | brevo) yonlendirir.
// Hata olursa yutulur ve loglanir; e-posta gonderimi hicbir zaman is akisini bozmaz.
@Component
@Slf4j
public class AsyncMailDispatcher {

    // "Ad Soyad <eposta@ornek.com>" desenini ayristirir.
    private static final Pattern FROM_PATTERN = Pattern.compile("^\\s*(.*?)\\s*<\\s*([^>]+)\\s*>\\s*$");

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final BrevoMailSender brevoMailSender;
    private final MailProperties mailProperties;

    public AsyncMailDispatcher(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            BrevoMailSender brevoMailSender,
            MailProperties mailProperties
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.brevoMailSender = brevoMailSender;
        this.mailProperties = mailProperties;
    }

    @Async
    public void dispatchHtml(String from, String to, String subject, String html) {
        try {
            if ("brevo".equalsIgnoreCase(mailProperties.provider())) {
                sendViaBrevo(from, to, subject, html);
            } else {
                sendViaSmtp(from, to, subject, html);
            }
            log.info("Siparis onay e-postasi gonderildi: {}", to);
        } catch (Exception e) {
            log.warn("E-posta gonderilemedi ({}): {}", to, e.getMessage());
        }
    }

    private void sendViaBrevo(String from, String to, String subject, String html) {
        String apiKey = mailProperties.brevoApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Brevo API anahtari ayarli degil (MAIL_BREVO_API_KEY)");
        }
        String[] parsed = parseFrom(from);
        brevoMailSender.send(apiKey, parsed[1], parsed[0], to, subject, html);
    }

    private void sendViaSmtp(String from, String to, String subject, String html) throws Exception {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            throw new IllegalStateException("JavaMailSender yapilandirilmamis");
        }
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
        helper.setFrom(from);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        sender.send(message);
    }

    // "Ad <email>" -> [name, email]; yalnizca "email" -> [storeName, email].
    private String[] parseFrom(String from) {
        if (from != null) {
            Matcher matcher = FROM_PATTERN.matcher(from);
            if (matcher.matches()) {
                return new String[]{matcher.group(1).trim(), matcher.group(2).trim()};
            }
        }
        String fallbackName = mailProperties.storeName() == null ? "" : mailProperties.storeName();
        return new String[]{fallbackName, from == null ? "" : from.trim()};
    }
}
