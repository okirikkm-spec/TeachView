package com.teachview.teachview_web.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "playlist_videos",
    uniqueConstraints = @UniqueConstraint(columnNames = {"playlist_id", "video_id"}))
public class PlaylistVideo {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", nullable = false)
    private Playlist playlist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @Column(nullable = false)
    private Integer position = 0;

    public PlaylistVideo(Playlist playlist, Video video, Integer position){
        this.playlist = playlist;
        this.video = video;
        this.position = position;
    }
}
