package com.teachview.teachview_web;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TeachViewWebsiteBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TeachViewWebsiteBackendApplication.class, args);
    }
}
