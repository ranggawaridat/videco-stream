import { useState } from 'react';
import api from '../api';

function Upload() {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !title) return;

        setUploading(true);
        setProgress(0);
        setMessage('');
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post('/videos/upload', formData, {
                params: { title: title },
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                }
            });
            setMessage('Upload successful! Video is being processed in the background.');
            setTitle('');
            setFile(null);
            setProgress(0);
        } catch (err) {
            console.error(err);
            // Show server-provided error details when available
            const serverDetail = err?.response?.data?.detail || err?.response?.data || null;
            if (err.response && err.response.status === 429) {
                setError(serverDetail || 'Quota exceeded: please slow down.');
            } else if (err.response && serverDetail) {
                setError(String(serverDetail));
            } else {
                setError('Upload failed. Please try again.');
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <h2 className="text-3xl font-bold mb-6 text-[var(--text)] text-center">Upload Video</h2>

            {message && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {message}
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {error}
                </div>
            )}

            <form onSubmit={handleUpload} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-2">Video Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--text)] placeholder-gray-400 transition"
                        placeholder="Enter a descriptive title..."
                        disabled={uploading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Video File</label>
                    <div className="relative border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--primary)] transition group cursor-pointer bg-gray-50">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploading}
                        />
                        <div className="pointer-events-none">
                            {file ? (
                                <div className="text-[var(--primary)] font-medium flex items-center justify-center">
                                    <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    {file.name}
                                </div>
                            ) : (
                                <div className="text-gray-400 group-hover:text-[var(--primary)] transition">
                                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span className="font-medium">Click to select</span> or drag and drop a video file
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {uploading && (
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4 overflow-hidden">
                        <div
                            className="bg-[var(--primary)] h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                        <p className="text-xs text-[var(--muted)] text-right mt-1">{progress}% Uploaded</p>
                    </div>
                )}

                <button
                    disabled={uploading || !file || !title}
                    className="w-full bg-[var(--primary)] hover:bg-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02] shadow"
                >
                    {uploading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                        </span>
                    ) : 'Upload Video'}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-700 text-center text-sm text-slate-500">
                <p>Supported Formats: MP4, MKV, AVI, MOV (Auto-converted to MP4)</p>
            </div>
        </div>
    );
}

export default Upload;
