package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.PlaylistVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PlaylistVideoRepository extends JpaRepository<PlaylistVideo, Long> {

    Optional<PlaylistVideo> findByPlaylistIdAndVideoId(Long playlistId, Long videoId);

    boolean existsByPlaylistIdAndVideoId(Long playlistId, Long videoId);

    @Query("SELECT COALESCE(MAX(pv.position), -1) FROM PlaylistVideo pv WHERE pv.playlist.id = :playlistId")
    int findMaxPosition(@Param("playlistId") Long playlistId);
}
