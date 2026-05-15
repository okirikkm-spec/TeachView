package com.teachview.teachview_web.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*", allowedHeaders = "*")
@RestController
public class SpaController {

    private static final Resource INDEX_HTML = new ClassPathResource("static/index.html");

    @GetMapping(
        value = {"/", "/login", "/register", "/profile", "/profile/**", "/video/**", "/playlist/**"},
        produces = MediaType.TEXT_HTML_VALUE
    )
    public ResponseEntity<Resource> index() {
        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .body(INDEX_HTML);
    }
}
