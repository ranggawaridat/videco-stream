import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
// video.js will be loaded lazily when the player is initialized to reduce initial bundle size
import api from '../api';
import AdScripts from './AdScripts';

function VideoPlayer() {
    const { id } = useParams();
    const videoNode = useRef(null); // ref ke <video>
    const player = useRef(null); // Video.js instance
    const hlsRef = useRef(null);

    const [videoData, setVideoData] = useState(null);
    const [playbackError, setPlaybackError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Fetch video data
    useEffect(() => {
        api.get(`/videos/${id}`)
            .then(res => setVideoData(res.data))
            .catch(err => console.error(err));
    }, [id]);

    // Initialize Video.js player
    useEffect(() => {
        if (!videoData || !videoNode.current) return;

        setPlaybackError('');
        setIsLoading(true);

        const src = videoData.hls_playlist_url;
        if (!src) {
            setPlaybackError('No playback URL available for this video.');
            setIsLoading(false);
            return;
        }

        const detectMimeType = async (url) => {
            try {
                const head = await fetch(url, { method: 'HEAD' });
                const ct = head.headers.get('content-type') || '';
                // Note: HEAD may be blocked by CORS on some CDNs; we only use content-type heuristics here

                if (ct.includes('mpegurl') || ct.includes('vnd.apple.mpegurl') || ct.includes('application/x-mpegurl')) {
                    return 'application/x-mpegURL';
                } else if (ct.includes('mp4') || ct.includes('video')) {
                    return 'video/mp4';
                }
            } catch (e) {
                console.debug('HEAD request failed; fallback to extension heuristic', e);
            }
            return url.includes('.mp4') ? 'video/mp4' : 'application/x-mpegURL';
        };

        const initPlayer = async () => {
            // Lazy-load video.js and its CSS the first time we initialize the player
            let videojsLib = null;
            try {
                const mod = await import('video.js');
                // import CSS dynamically (Vite will inject styles)
                await import('video.js/dist/video-js.css');
                videojsLib = mod && (mod.default || mod);
            } catch (e) {
                console.error('Failed to load video.js dynamically', e);
                setPlaybackError('Player failed to load. Silakan muat ulang halaman.');
                setIsLoading(false);
                return;
            }
            const type = await detectMimeType(src);

            // Dispose any existing HLS instance
            if (hlsRef.current) {
                try { hlsRef.current.destroy(); } catch (e) { console.debug(e); }
                hlsRef.current = null;
            }

            // Aman: cek apakah player sudah ada
            let existingPlayer = null;
            try { existingPlayer = videojsLib.getPlayer(videoNode.current); } catch (e) { existingPlayer = null; }
            if (existingPlayer && !existingPlayer.isDisposed()) {
                // Try reset; if reset not available fall back to dispose+recreate
                try {
                    if (typeof existingPlayer.reset === 'function') {
                        existingPlayer.reset();
                        existingPlayer.src({ src, type });
                        existingPlayer.poster(videoData.thumbnail_url || '');
                        player.current = existingPlayer;
                        setIsLoading(false);
                        return;
                    }
                } catch (e) {
                    console.debug('existingPlayer.reset failed, will dispose and recreate', e);
                }
                try { existingPlayer.dispose(); } catch (e) { console.debug(e); }
                player.current = null;
            }

            // Buat player baru
            player.current = videojsLib(videoNode.current, {
                controls: true,
                fluid: true,
                playbackRates: [0.5, 1, 1.5, 2],
                poster: videoData.thumbnail_url || '',
                sources: [{ src, type }]
            });

            player.current.ready(() => setIsLoading(false));

            player.current.on('error', async () => {
                const err = player.current.error && player.current.error();
                const msg = err?.message || 'Unknown playback error';
                setPlaybackError(`${msg} (code: ${err?.code ?? 'N/A'})`);

                // If the source is HLS, try hls.js fallback using the underlying video element
                if (type === 'application/x-mpegURL') {
                    try {
                        // dispose video.js player first
                        try { player.current.dispose(); } catch (e) { console.debug(e); }
                        player.current = null;
                        const Hls = (await import('hls.js')).default;
                        if (Hls && Hls.isSupported()) {
                            const hls = new Hls();
                            hlsRef.current = hls;
                            hls.loadSource(src);
                            hls.attachMedia(videoNode.current);
                            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                                // manifest parsed; user can play via controls
                                console.debug('hls.js manifest parsed');
                                setIsLoading(false);
                            });
                            hls.on(Hls.Events.ERROR, (event, data) => {
                                console.error('hls.js error', event, data);
                                setPlaybackError('hls.js playback error');
                                setIsLoading(false);
                            });
                        } else {
                            // fallback: set src directly
                            videoNode.current.src = src;
                            videoNode.current.load();
                            setIsLoading(false);
                        }
                    } catch (e) {
                        console.error('hls.js fallback failed', e);
                    }
                }
            });
        };

        initPlayer();

        // Cleanup saat unmount
        return () => {
            const existingPlayer = (() => { try { return videojs.getPlayer(videoNode.current); } catch (e) { return null; } })();
            if (existingPlayer && !existingPlayer.isDisposed()) {
                existingPlayer.dispose();
                player.current = null;
            }
            if (hlsRef.current) {
                try { hlsRef.current.destroy(); } catch (e) { console.debug(e); }
                hlsRef.current = null;
            }
        };
    }, [videoData]);


    if (!videoData) return <div className="text-[var(--muted)]">Loading video data...</div>;

    return (
        <div className="max-w-5xl mx-auto mt-8 px-4">
            <AdScripts />
            {/* Title */}
            <h1 className="text-3xl font-bold mb-4 text-[var(--text)]">{videoData.title}</h1>

            <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black border border-[var(--border)]">
                {/* Thumbnail di belakang video saat loading */}
                {videoData.thumbnail_url && isLoading && (
                    <img
                        src={videoData.thumbnail_url}
                        alt="thumbnail"
                        className="absolute inset-0 w-full h-full object-cover z-0"
                    />
                )}

                {/* Spinner overlay */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Video.js player */}
                <div data-vjs-player className="relative z-20">
                    <video ref={videoNode} className="video-js vjs-big-play-centered vjs-theme-forest w-full" />
                </div>
            </div>

            {/* Metadata row */}
            <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="text-sm text-[var(--muted)] flex items-center gap-2">
                        <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>{videoData.duration ? `${Math.floor(videoData.duration / 60)}:${(videoData.duration % 60).toString().padStart(2, '0')}` : '0:00'}</span>
                    </div>
                    <div className="text-sm text-[var(--muted)] px-2 py-0.5 rounded bg-gray-50 border border-[var(--border)]">{videoData.resolution || 'HD'}</div>
                </div>

                <div className="flex items-center gap-3">
                    {/* reserved for future actions */}
                </div>
            </div>

            {/* Playback error */}
            {playbackError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded flex items-center justify-between">
                    <div>
                        <div className="font-semibold">Playback error</div>
                        <div className="text-sm">{playbackError}</div>
                        <div className="text-xs text-[var(--muted)] mt-1">Jika masalah berlanjut, muat ulang halaman.</div>
                    </div>
                    <div>
                        <button onClick={() => window.location.reload()} className="ml-4 px-3 py-1 rounded bg-white border text-[var(--text)] hover:bg-gray-50">Muat Ulang</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VideoPlayer;
