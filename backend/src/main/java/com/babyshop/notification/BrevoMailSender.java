package com.babyshop.notification;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

// Brevo (eski adiyla Sendinblue) transactional e-posta HTTP API'si uzerinden gonderir.
// HTTPS (443) kullanir; PaaS giden SMTP'yi engellese bile calisir.
@Component
public class BrevoMailSender {

    private final RestClient restClient;

    public BrevoMailSender() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(10_000);
        this.restClient = RestClient.builder()
                .baseUrl("https://api.brevo.com/v3")
                .requestFactory(factory)
                .build();
    }

    public void send(String apiKey, String fromEmail, String fromName, String to, String subject, String html) {
        Map<String, Object> sender = (fromName == null || fromName.isBlank())
                ? Map.of("email", fromEmail)
                : Map.of("email", fromEmail, "name", fromName);

        Map<String, Object> body = Map.of(
                "sender", sender,
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "htmlContent", html
        );

        restClient.post()
                .uri("/smtp/email")
                .header("api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }
}
