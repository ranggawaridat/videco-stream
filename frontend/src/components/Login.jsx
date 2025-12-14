import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const res = await api.post('/auth/token', formData);
            localStorage.setItem('token', res.data.access_token);
            navigate('/upload');
        } catch (err) {
            console.error(err);
            setError('Login failed. Check your credentials.');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)]">
            <h2 className="text-2xl mb-6 font-bold text-center text-[var(--text)]">Login</h2>
            {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-4 text-sm border border-red-100">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm text-[var(--muted)] mb-1">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-2 bg-gray-50 rounded border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm text-[var(--muted)] mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 bg-gray-50 rounded border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none"
                        required
                    />
                </div>
                <button className="w-full bg-[var(--primary)] text-white py-2 rounded font-semibold hover:bg-blue-500 transition">
                    Login
                </button>
            </form>
            <p className="mt-4 text-center text-sm text-[var(--muted)]">
                Don't have an account? <Link to="/register" className="text-[var(--primary)] hover:underline">Register</Link>
            </p>
        </div>
    );
}

export default Login;
