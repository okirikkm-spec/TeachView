package com.teachview.teachview_web.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "subscription_tiers")
@Data
public class SubscriptionTier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer price; // в рублях за месяц

    private Integer sortOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;
}
