package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.Playlist;
import com.teachview.teachview_web.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlaylistRepository extends JpaRepository<Playlist, Long>{

    @Query("""
        SELECT p FROM Playlist p
        LEFT JOIN FETCH p.playlistVideos pv
        LEFT JOIN FETCH pv.video
        WHERE p.id = :id
    """)
    Optional<Playlist> findByIdWithVideos(@Param("id") Long id);

    @Query("""
        SELECT p FROM Playlist p
        LEFT JOIN FETCH p.playlistVideos pv
        LEFT JOIN FETCH pv.video
        WHERE p.owner = :owner
        ORDER BY p.updatedAt DESC
    """)
    List<Playlist> findByOwnerWithVideos(@Param("owner") User owner);

    @Query("""
        SELECT p FROM Playlist p
        LEFT JOIN FETCH p.playlistVideos pv
        LEFT JOIN FETCH pv.video
        WHERE p.owner.id = :ownerId AND p.publicVisible = true
        ORDER BY p.updatedAt DESC
    """)
    List<Playlist> findPublicByOwnerIdWithVideos(@Param("ownerId") Long ownerId);
}
