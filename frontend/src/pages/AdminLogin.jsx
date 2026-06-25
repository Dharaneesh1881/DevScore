import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiUser, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';

const API_BASE = '/api';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            localStorage.setItem('adminToken', data.token);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#080812] flex items-center justify-center px-4">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#ff4444]/5 blur-[100px]" />
                <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-[#ff6b35]/5 blur-[80px]" />
            </div>

            <div className="relative w-full max-w-sm">
                {/* Icon */}
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff4444]/30 to-[#ff6b35]/20 border border-[#ff4444]/30 flex items-center justify-center shadow-[0_0_40px_rgba(255,68,68,0.15)]">
                        <FiShield size={28} className="text-[#ff4444]" />
                    </div>
                </div>

                <div className="bg-[#10101e] border border-[#1e1e30] rounded-2xl p-8 shadow-2xl">
                    <h1 className="text-2xl font-bold text-white text-center mb-1">Admin Panel</h1>
                    <p className="text-[#555] text-sm text-center mb-8">System administrator access only</p>

                    {error && (
                        <div className="flex items-center gap-2 mb-5 px-3 py-2.5 bg-[#ff4444]/10 border border-[#ff4444]/30 rounded-lg text-[#ff4444] text-sm">
                            <FiAlertCircle size={15} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Admin ID */}
                        <div>
                            <label className="text-xs font-semibold text-[#888] mb-1.5 block">Admin ID</label>
                            <div className="relative">
                                <FiUser size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                                <input
                                    type="text"
                                    value={id}
                                    onChange={e => setId(e.target.value)}
                                    placeholder="admin"
                                    required
                                    className="w-full pl-9 pr-4 py-2.5 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#ff4444]/60 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-xs font-semibold text-[#888] mb-1.5 block">Password</label>
                            <div className="relative">
                                <FiLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-9 pr-10 py-2.5 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#ff4444]/60 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888] transition-colors"
                                >
                                    {showPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-gradient-to-r from-[#ff4444] to-[#ff6b35] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_20px_rgba(255,68,68,0.3)] mt-2"
                        >
                            {loading ? 'Authenticating…' : 'Sign In to Admin'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-[#444] mt-4">
                    Platform Administration &amp; Monitoring System
                </p>
            </div>
        </div>
    );
}
