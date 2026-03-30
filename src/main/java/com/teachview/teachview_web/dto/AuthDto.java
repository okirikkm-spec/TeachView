package com.teachview.teachview_web.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


public class AuthDto {


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        private String username;
        private String email;
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest{
        private String email;
        private String password;
    }

    @Data
    @AllArgsConstructor
    public static class AuthResponse{
        private String token;
    }
}