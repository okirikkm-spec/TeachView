package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.dto.UserResponseDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/{id}")
    public ResponseEntity<UserResponseDto> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Пользователь не найден"));
        return ResponseEntity.ok(UserResponseDto.from(user));
    }
}
