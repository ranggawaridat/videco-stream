import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import AdScripts from './AdScripts';

function VideoList() {
    const [videos, setVideos] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Fetch videos
        api.get('/videos/')
            .then(res => {
                if (Array.isArray(res.data)) {
                    setVideos(res.data);
                } else {
                    console.error("API did not return a list:", res.data);
                    setVideos([]);
                }
            })
            .catch(err => {
                console.error(err);
                setVideos([]);
            });

        // Check if current user is admin
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setIsAdmin(payload.role === 'admin');
            } catch (e) {
                console.error('Failed to parse token:', e);
            }
        }
    }, []);

    const handleDelete = async (videoId, videoTitle) => {
        if (!window.confirm(`Are you sure you want to delete "${videoTitle}"?`)) {
            return;
        }

        try {
            await api.delete(`/videos/${videoId}`);
            setVideos(videos.filter(v => v.id !== videoId));
            alert('Video deleted successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to delete video: ' + (err.response?.data?.detail || 'Unknown error'));
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <AdScripts />
            {videos.map(video => (
                <div key={video.id} className="block bg-[var(--surface)] rounded-lg overflow-hidden hover:shadow-lg transition border border-[var(--border)] relative">
                    <Link to={`/watch/${video.id}`} className="block">
                        <div className="aspect-video bg-black relative">
                            {video.thumbnail_url ? (
                                <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">No Thumb</div>
                            )}
                            {video.duration && (
                                <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 px-1 rounded text-xs">
                                    {`${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}`}
                                </span>
                            )}
                        </div>
                        <div className="p-4">
                            <h3 className="font-semibold truncate text-[var(--text)]">{video.title}</h3>
                            <div className="flex items-center justify-between mt-2">
                                {video.resolution && <p className="text-sm text-[var(--muted)]">{video.resolution}</p>}
                                <div className="flex items-center gap-1 text-sm text-[var(--muted)]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                    </svg>
                                    <span>{video.view_count || 0}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                    {isAdmin && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete(video.id, video.title);
                            }}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition z-10"
                            title="Delete video"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

export default VideoList;
