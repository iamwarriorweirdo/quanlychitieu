import React, { useState, useEffect } from 'react';
import { getCurrentSession, loginUser, registerUser, setCurrentSession, initDB } from './services/storageService';
import { User } from './types';
import { Dashboard } from './components/Dashboard';
import { Wallet, ArrowRight, Lock, User as UserIcon, Eye, EyeOff, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Initialize DB tables
      await initDB();
      // Check session
      const session = getCurrentSession();
      if (session) {
        setUser(session);
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  const validatePassword = (password: string) => {
    // Requires at least 1 Uppercase and 1 Digit
    const hasUpperCase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    return hasUpperCase && hasDigit;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    if (!isLoginView) {
      // Registration validation
      if (!validatePassword(passwordInput)) {
        setError('Mật khẩu phải chứa ít nhất một chữ IN HOA và một chữ số.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLoginView) {
        const loggedInUser = await loginUser(usernameInput, passwordInput);
        if (loggedInUser) {
          setUser(loggedInUser);
          setCurrentSession(loggedInUser);
        } else {
          setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        }
      } else {
        const newUser = await registerUser(usernameInput, passwordInput);
        setUser(newUser);
        setCurrentSession(newUser);
      }
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentSession(null);
    setUsernameInput('');
    setPasswordInput('');
    setIsLoginView(true);
    setShowPassword(false);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
          <p className="text-slate-500 font-medium">Đang kết nối cơ sở dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Wallet className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Quản lý chi tiêu</h1>
          <p className="text-indigo-100">Quản lý tài chính thông minh</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tên đăng nhập</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-10 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nhập tên đăng nhập"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-10 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nhập mật khẩu"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isLoginView && (
                <p className="text-xs text-slate-500 mt-1">Yêu cầu: Ít nhất 1 chữ in hoa và 1 số.</p>
              )}
            </div>

            {error && <p className="text-rose-500 text-sm bg-rose-50 p-3 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span>{isLoginView ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setError('');
                setPasswordInput('');
                setShowPassword(false);
              }}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium hover:underline"
              disabled={isLoading}
            >
              {isLoginView ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;