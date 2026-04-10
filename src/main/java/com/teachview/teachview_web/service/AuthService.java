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
    private final LoginAttemptService loginAttemptService;

    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request){
        if (userRepository.existsByEmail(request.getEmail())){
            throw new RuntimeException("Email уже занят");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(RoleEnum.USER);

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return new AuthDto.AuthResponse(token);
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request){
        String email = request.getEmail();

        if (loginAttemptService.isBlocked(email)) {
            long seconds = loginAttemptService.secondsUntilUnlock(email);
            throw new RuntimeException("Слишком много неудачных попыток. Попробуйте через " + seconds + " секунд");
        }

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> {
                loginAttemptService.loginFailed(email);
                return new RuntimeException("Пользователь не найден");
            });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())){
            loginAttemptService.loginFailed(email);
            throw new RuntimeException("Неверный пароль");
        }

        loginAttemptService.loginSucceeded(email);
        String token = jwtService.generateToken(user.getEmail());
        return new AuthDto.AuthResponse(token);
    }
}
