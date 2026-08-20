import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState('.');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isRemembered = localStorage.getItem('rememberMe') === 'true';

      if (session) {
        if (isRemembered) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile?.role === 'admin') {
            navigate('/admin-dashboard');
          } else if (profile?.role === 'supervisor') {
            navigate('/supervisor-dashboard'); 
          } else {
            navigate('/dashboard');
          }
        } else {
          await supabase.auth.signOut();
        }
      }
    };
    checkExistingSession();
  }, [navigate]);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingDots((prev) => {
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '.';
        });
      }, 400);
    } else {
      setLoadingDots('.');
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const cleanUsername = formData.username.trim();
      let authError = null;
      let authData = null;

      if (cleanUsername.includes('@')) {
        const res = await supabase.auth.signInWithPassword({ email: cleanUsername, password: formData.password });
        authData = res.data;
        authError = res.error;
      } else {
        let res = await supabase.auth.signInWithPassword({ email: `${cleanUsername}@student.com`, password: formData.password });
        
        if (res.error) {
          res = await supabase.auth.signInWithPassword({ email: `${cleanUsername}@supervisor.com`, password: formData.password });
          
          if (res.error) {
            res = await supabase.auth.signInWithPassword({ email: `${cleanUsername}@admin.com`, password: formData.password });
          }
        }
        authData = res.data;
        authError = res.error;
      }

      if (authError) throw authError;

      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.role === 'admin') {
        navigate('/admin-dashboard'); 
      } else if (profile?.role === 'supervisor') {
        navigate('/supervisor-dashboard'); 
      } else {
        navigate('/dashboard'); 
      }

    } catch (error) {
      setErrorMessage("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex select-none bg-white font-sans">
      
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 z-20 bg-white h-full overflow-hidden">
        <div className="w-full max-w-md">
          
          <div className="flex flex-col items-center mb-10">
            <Link to="/" className="flex items-center justify-center mb-2">
              <img src="/logo.png" alt="InternTrack Logo" draggable="false" className="h-8 sm:h-10 w-auto" />
            </Link>
            <p className="text-sm text-gray-500">Welcome back! Please enter your details.</p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-xs text-center border border-red-200 font-semibold animate-fade-in">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1.5">Username / Email</label>
              <input 
                type="text" 
                name="username" 
                value={formData.username} 
                onChange={handleChange} 
                placeholder="Enter your username or email" 
                required 
                className="w-full px-4 py-2.5 rounded border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none text-sm transition-colors placeholder-gray-400" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder="••••••••" 
                  required 
                  className="w-full px-4 py-2.5 rounded border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none text-sm transition-colors placeholder-gray-400 pr-10" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input 
                  id="remember-me" 
                  name="remember-me" 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  className="h-4 w-4 text-green-600 focus:ring-green-600 border-gray-300 rounded cursor-pointer" 
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer">Remember me</label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-bold text-green-600 hover:text-green-700 hover:underline transition-colors">Forgot password?</a>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full flex justify-center py-3 px-4 rounded bg-green-600 hover:bg-green-700 text-sm font-bold text-white transition-colors focus:outline-none shadow-sm disabled:bg-gray-400"
              >
                {loading ? `Logging in ${loadingDots}` : 'LOG IN'}
              </button>
            </div>
            
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account? <Link to="/sign" className="font-bold text-green-600 hover:text-green-700 hover:underline transition-colors">Sign up</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative bg-green-600 flex-col items-center pt-20 overflow-hidden h-full">
        <div className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay" style={{ backgroundImage: `url('/body.jpeg')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/90 to-green-800/90"></div>
        <div className="relative z-20 flex flex-col items-center text-center w-full max-w-lg px-8 drop-shadow-md">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">Effortlessly manage your internship journey.</h1>
          <p className="text-green-100 text-lg">Log in to access your dashboard and track your professional progress.</p>
        </div>
        <div className="absolute bottom-0 w-full flex justify-center z-10 pointer-events-none">
          <img src="/person.png" alt="Professional Intern" draggable="false" className="w-[115%] max-w-2xl h-auto object-cover translate-y-[60%]" />
        </div>
      </div>
      
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default Login;