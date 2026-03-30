package com.teachview.teachview_web.service;


import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.teachview.teachview_web.Enum.RoleEnum;
import com.teachview.teachview_web.dto.AuthDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request){
        if (userRepository.existsByEmail(request.getEmail())){
            throw new RuntimeException("Email уже занят");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(RoleEnum.STUDENT);

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return new AuthDto.AuthResponse(token);
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request){
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(()-> new RuntimeException("Пользователь не найден"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())){
            throw new RuntimeException("Неверный пароль");
        }

        String token = jwtService.generateToken(user.getEmail());
        return new AuthDto.AuthResponse(token);
    }
}
