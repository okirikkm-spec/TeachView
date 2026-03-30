package com.teachview.teachview_web.dto;

import com.teachview.teachview_web.entity.User;
import lombok.Data;

@Data
public class UserResponseDto {
    private Long id;
    private String username;
    private String email;
    private String role;
    private String avatarUrl;

    public static UserResponseDto from(User user) {
        UserResponseDto dto = new UserResponseDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole().name());
        dto.setAvatarUrl(user.getAvatarPath() != null ? "/" + user.getAvatarPath(): null);
        return dto;
    }
}
