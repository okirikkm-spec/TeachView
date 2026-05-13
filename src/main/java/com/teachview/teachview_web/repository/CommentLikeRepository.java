package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {
    Optional<CommentLike> findByCommentIdAndUserId(Long commentId, Long userId);
    long countByCommentIdAndLiked(Long commentId, Boolean liked);

    @Modifying
    @Query("DELETE FROM CommentLike cl WHERE cl.comment.id IN :commentIds")
    void deleteByCommentIdIn(@Param("commentIds") List<Long> commentIds);
}
