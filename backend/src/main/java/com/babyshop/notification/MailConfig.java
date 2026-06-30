package com.babyshop.notification;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableConfigurationProperties(MailProperties.class)
@EnableAsync
public class MailConfig {
}
