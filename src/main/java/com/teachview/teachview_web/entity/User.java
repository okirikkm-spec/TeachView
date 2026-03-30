package com.teachview.teachview_web.entity;

import com.teachview.teachview_web.Enum.RoleEnum;

import lombok.Data;
import jakarta.persistence.*;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String email;
    private String password;
    private String avatarPath;

    @Enumerated(EnumType.STRING)
    private RoleEnum role;
}
