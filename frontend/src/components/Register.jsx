import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/auth/register', {
                username,
                email,
                password
            });
            alert('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'Registration failed');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)]">
            <h2 className="text-2xl mb-6 font-bold text-center text-[var(--text)]">Create Account</h2>
            {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-4 text-sm border border-red-100">{error}</div>}
            <form onSubmit={handleRegister} className="space-y-4">
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
                    <label className="block text-sm text-[var(--muted)] mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 bg-gray-50 rounded border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none"
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
                    Register
                </button>
            </form>
            <p className="mt-4 text-center text-sm text-[var(--muted)]">
                Already have an account? <Link to="/login" className="text-[var(--primary)] hover:underline">Login</Link>
            </p>
        </div>
    );
}

export default Register;
