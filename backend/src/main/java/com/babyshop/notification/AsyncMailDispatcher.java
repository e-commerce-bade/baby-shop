package com.babyshop.notification;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

// SMTP gonderimini ayri bir is parcaciginda yapar; boylece odeme callback'ini bloklamaz.
// Yalnizca duz String'ler alir (JPA lazy alanlarina dokunmaz). Hata olursa yutulur ve loglanir;
// e-posta gonderimi hicbir zaman is akisini (odeme/siparis) bozmaz.
@Component
@Slf4j
public class AsyncMailDispatcher {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public AsyncMailDispatcher(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    @Async
    public void dispatchHtml(String from, String to, String subject, String html) {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("JavaMailSender yapilandirilmamis; e-posta atlandi ({}).", to);
            return;
        }

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            sender.send(message);
            log.info("Siparis onay e-postasi gonderildi: {}", to);
        } catch (Exception e) {
            log.warn("E-posta gonderilemedi ({}): {}", to, e.getMessage());
        }
    }
}
