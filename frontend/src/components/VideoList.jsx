import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import AdScripts from './AdScripts';

function VideoList() {
    const [videos, setVideos] = useState([]);

    useEffect(() => {
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
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <AdScripts />
            {videos.map(video => (
                <Link to={`/watch/${video.id}`} key={video.id} className="block bg-[var(--surface)] rounded-lg overflow-hidden hover:shadow-lg transition border border-[var(--border)]">
                    <div className="aspect-video bg-black relative">
                        {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">No Thumb</div>
                        )}
                        <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 px-1 rounded text-xs">
                            {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : ''}
                        </span>
                    </div>
                    <div className="p-4">
                        <h3 className="font-semibold truncate text-[var(--text)]">{video.title}</h3>
                        <p className="text-sm text-[var(--muted)]">{video.resolution}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default VideoList;
