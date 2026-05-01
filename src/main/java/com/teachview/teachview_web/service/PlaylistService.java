package com.teachview.teachview_web.service;

import com.teachview.teachview_web.dto.PlaylistDto;
import com.teachview.teachview_web.entity.Playlist;
import com.teachview.teachview_web.entity.PlaylistVideo;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.repository.PlaylistRepository;
import com.teachview.teachview_web.repository.PlaylistVideoRepository;
import com.teachview.teachview_web.repository.VideoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class PlaylistService {
    
    private final PlaylistRepository playlistRepository;
    private final PlaylistVideoRepository playlistVideoRepository;
    private final VideoRepository videoRepository;

    public PlaylistService(PlaylistRepository playlistRepository,
        PlaylistVideoRepository playlistVideoRepository,
        VideoRepository videoRepository) {

            this.playlistRepository = playlistRepository;
            this.playlistVideoRepository = playlistVideoRepository;
            this.videoRepository = videoRepository;
    }

    @Transactional(readOnly = true)
    public List<PlaylistDto> getMyPlaylists(User user) {
        return playlistRepository.findByOwnerWithVideos(user)
            .stream().map(PlaylistDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PlaylistDto> getPublicPlaylistsByAuthor(Long authorId) {
        return playlistRepository.findPublicByOwnerIdWithVideos(authorId)
            .stream()
            .map(PlaylistDto::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public PlaylistDto getPlaylist(Long playlistId, User currentUser) {
        Playlist playlist = playlistRepository.findByIdWithVideos(playlistId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Плейлист не найден"));
        
        if (!playlist.isPublicVisible() && !playlist.getOwner().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это приватный плейлист");
        }
        return PlaylistDto.from(playlist);
    }

    @Transactional
    public PlaylistDto createPlaylist(User owner, String name, String description, boolean isPublic) {
        Playlist playlist = new Playlist();
        playlist.setOwner(owner);
        playlist.setName(name);
        playlist.setDescription(description);
        playlist.setPublicVisible(isPublic);
        return PlaylistDto.from(playlistRepository.save(playlist));
    }

    @Transactional
    public PlaylistDto updatePlaylist(Long playlistId, User user,
        String name, String description, Boolean isPublic) {

        Playlist playlist = getOwnedPlaylist(playlistId, user);
        if (name != null) playlist.setName(name);
        if (description != null) playlist.setDescription(description);
        if (isPublic != null) playlist.setPublicVisible(isPublic);
        return PlaylistDto.from(playlistRepository.save(playlist));
    }

    @Transactional
    public void deletePlaylist(Long playlistId, User user) {
        Playlist playlist = getOwnedPlaylist(playlistId, user);
        playlistRepository.delete(playlist);
    }

    @Transactional
    public PlaylistDto addVideo(Long playlistId, Long videoId, User user) {
        Playlist playlist = getOwnedPlaylist(playlistId, user);

        if (playlistVideoRepository.existsByPlaylistIdAndVideoId(playlistId, videoId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Видео уже есть в плейлисте");
        }

        Video video = videoRepository.findById(videoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Видео не найдено"));
        
        int nextPosition = playlistVideoRepository.findMaxPosition(playlistId) + 1;
        playlistVideoRepository.save(new PlaylistVideo(playlist, video, nextPosition));

        return PlaylistDto.from(playlistRepository.findByIdWithVideos(playlistId).orElseThrow());
    }

    @Transactional
    public PlaylistDto removeVideo(Long playlistId, Long videoId, User user) {
        getOwnedPlaylist(playlistId, user);

        PlaylistVideo pv = playlistVideoRepository.findByPlaylistIdAndVideoId(playlistId, videoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Видео не найдено в плейлисте"));
        
        playlistVideoRepository.delete(pv);

        return PlaylistDto.from(playlistRepository.findByIdWithVideos(playlistId).orElseThrow());
    }

    @Transactional
    public PlaylistDto reorderVideos(Long playlistId, List<Long> videoIds, User user) {
        getOwnedPlaylist(playlistId, user);

        for (int i = 0; i < videoIds.size(); i++) {
            PlaylistVideo pv = playlistVideoRepository.findByPlaylistIdAndVideoId(playlistId, videoIds.get(i))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Видео не найдено в плейлисте"));
            pv.setPosition(i);
            playlistVideoRepository.save(pv);
        }

        return PlaylistDto.from(playlistRepository.findByIdWithVideos(playlistId).orElseThrow());
    }

    private Playlist getOwnedPlaylist(Long playlistId, User user) {
        Playlist playlist = playlistRepository.findById(playlistId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Плейлист не найден"));
        
        if (!playlist.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это не ваш плейлист");
        }

        return playlist;
    }
}
