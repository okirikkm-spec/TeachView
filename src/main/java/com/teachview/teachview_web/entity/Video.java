package com.teachview.teachview_web.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;


@Entity
@Table(name = "videos")
@Data
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String fileName;
    private String filePath;
    private String contentType;
    
    private String thumbnailPath;
    @Column(columnDefinition = "TEXT")
    private String description;
    private Long duration;
    private Long viewCount = 0L;

    @ElementCollection
    @CollectionTable(
        name = "video_tags",
        joinColumns = @JoinColumn(name = "video_id")
    )
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id")
    private User uploadedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "required_tier_id")
    private SubscriptionTier requiredTier;
}