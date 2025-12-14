import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import VideoList from './components/VideoList';
import Upload from './components/Upload';
import Login from './components/Login';
import Register from './components/Register';
import VideoPlayer from './components/VideoPlayer';

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--primary)] selection:text-white">
                <Navbar />
                <main className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
                    <Routes>
                        <Route path="/" element={<VideoList />} />
                        <Route path="/upload" element={<Upload />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/watch/:id" element={<VideoPlayer />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
