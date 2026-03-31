package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("SELECT c FROM Comment c JOIN FETCH c.user JOIN FETCH c.video v JOIN FETCH v.uploadedBy WHERE c.video.id = :videoId ORDER BY c.createdAt DESC")
    List<Comment> findByVideoIdOrderByCreatedAtDesc(@Param("videoId") Long videoId);

    @Query("SELECT c FROM Comment c JOIN FETCH c.user JOIN FETCH c.video v JOIN FETCH v.uploadedBy WHERE c.id = :id")
    Optional<Comment> findByIdWithRelations(@Param("id") Long id);
}
