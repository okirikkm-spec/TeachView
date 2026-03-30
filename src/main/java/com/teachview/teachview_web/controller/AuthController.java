package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;


import com.teachview.teachview_web.dto.AuthDto;
import com.teachview.teachview_web.dto.UserResponseDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;


    @PostMapping("/register")
    public ResponseEntity<AuthDto.AuthResponse> register(@RequestBody AuthDto.RegisterRequest request){
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login (@RequestBody AuthDto.LoginRequest request){
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getMe(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(UserResponseDto.from(currentUser));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadAvatar(@AuthenticationPrincipal User currentUser,
        @RequestParam("file") MultipartFile file){

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Только изображения");
        }

        String ext = contentType.substring(contentType.indexOf('/') + 1);
        Path dir = Paths.get("uploads/avatars");
        
        try{
            Files.createDirectories(dir);
            Path dest = dir.resolve(currentUser.getId() + "." + ext);
            Files.copy(file.getInputStream(), dest, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            currentUser.setAvatarPath("uploads/avatars/" + currentUser.getId() + "." + ext);
            userRepository.save(currentUser);
        } catch (IOException e){
            return ResponseEntity.status(HttpStatus.INSUFFICIENT_STORAGE).body("Ошибка сохранения");
        }
        return ResponseEntity.ok(UserResponseDto.from(currentUser));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponseDto> updateMe(@AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, String> body) {
        String username = body.get("username");
        String email = body.get("email");
        if (username != null && !username.isBlank()) currentUser.setUsername(username);
        if (email != null && !email.isBlank()) currentUser.setEmail(email);
        userRepository.save(currentUser);
        return ResponseEntity.ok(UserResponseDto.from(currentUser));
    }

    @PostMapping("/me/password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, String> body) {

        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (!passwordEncoder.matches(oldPassword, currentUser.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Неверный текущий пароль");
        }
        if (newPassword == null || newPassword.length() < 3) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Пароль должен содержать не менее 3 символов");
        }

        currentUser.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(currentUser);
        return ResponseEntity.ok().build();
    }


}
