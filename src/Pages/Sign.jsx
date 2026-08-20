import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';

function Sign() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    department: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState('.');
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    number: false,
    symbol: false,
  });

  const departmentOptions = [
    { value: 'BSIT', label: 'Bachelor of Science in Information Technology', logo: '/ccs.png' },
    { value: 'BSHM', label: 'Bachelor of Science in Hospitality Management', logo: '/hm.png' },
    { value: 'BSCRIM', label: 'Bachelor of Science in Criminology', logo: '/crim.png' },
    { value: 'BSAB', label: 'Bachelor of Science in Agribusiness', logo: '/agri.png' },
  ];

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
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password') {
      setPasswordCriteria({
        length: value.length >= 8,
        uppercase: /^[A-Z]/.test(value),
        number: /[0-9]/.test(value),
        symbol: /[!@#$%^&*(),.?":{}|<>\-_]/.test(value),
      });
    }
  };

  const handleDepartmentSelect = (deptValue) => {
    setFormData({
      ...formData,
      department: deptValue
    });
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const isPasswordValid = 
      passwordCriteria.length && 
      passwordCriteria.uppercase && 
      passwordCriteria.number && 
      passwordCriteria.symbol;

    if (!isPasswordValid) {
      setErrorMessage("Please ensure your password meets all the strong security requirements.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!formData.department) {
      setErrorMessage("Please select a department.");
      return;
    }

    setLoading(true);

    try {
      const cleanUsername = formData.username.trim();
      const formattedUsername = cleanUsername.endsWith('@student.com')
        ? cleanUsername
        : `${cleanUsername}@student.com`;

      const { error: authError } = await supabase.auth.signUp({
        email: formattedUsername,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            username: formattedUsername,
            department: formData.department,
          }
        }
      });

      if (authError) throw authError;

      setShowSuccessModal(true);

    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate('/login');
  };

  const selectedDepartment = departmentOptions.find(d => d.value === formData.department);

  return (
    <div className="h-screen overflow-hidden flex select-none bg-white font-sans relative">
      
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 z-20 bg-white h-full overflow-hidden">
        <div className="w-full max-w-md">
          
          <div className="flex flex-col items-center mb-6">
            <Link to="/" className="flex items-center justify-center mb-2">
              <img 
                src="/logo.png" 
                alt="InternTrack Logo" 
                draggable="false"
                className="h-8 sm:h-10 w-auto" 
              />
            </Link>
            <p className="text-sm text-gray-500">
              Fill in the details to join.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-xs text-center border border-red-200 font-semibold animate-fade-in">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">First Name</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  required
                  className="w-full px-4 py-2.5 rounded border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none text-sm transition-colors placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Last Name</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  required
                  className="w-full px-4 py-2.5 rounded border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none text-sm transition-colors placeholder-gray-400"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-gray-900 mb-1.5">Department</label>
              
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full px-4 py-2.5 rounded border ${isDropdownOpen ? 'border-green-600 ring-1 ring-green-600' : 'border-gray-200'} bg-white flex justify-between items-center cursor-pointer transition-colors`}
              >
                {selectedDepartment ? (
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <img src={selectedDepartment.logo} alt={selectedDepartment.label} className="w-5 h-5 object-contain shrink-0" />
                    <span className="text-sm text-gray-900 truncate">{selectedDepartment.label}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Choose a department</span>
                )}
                
                <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto">
                  {departmentOptions.map((dept) => (
                    <div 
                      key={dept.value}
                      onClick={() => handleDepartmentSelect(dept.value)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      <img src={dept.logo} alt={dept.label} className="w-6 h-6 object-contain shrink-0" draggable="false" />
                      <span className="text-sm text-gray-900 font-medium">{dept.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1.5">Username</label>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
                className="w-full px-4 py-2.5 rounded border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none text-sm transition-colors placeholder-gray-400"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-gray-900 mb-1.5">Password</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none text-sm transition-colors placeholder-gray-400"
              />
              
              {isPasswordFocused && (
                <div className="absolute z-50 left-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl p-4 animate-fade-in">
                  <p className="text-xs font-bold text-gray-800 mb-2.5 uppercase tracking-wide">Strong Password Rules:</p>
                  <ul className="space-y-2 text-xs font-medium">
                    <li className={`flex items-center gap-2.5 transition-colors duration-300 ${passwordCriteria.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={passwordCriteria.uppercase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      Starts with a capital letter
                    </li>
                    <li className={`flex items-center gap-2.5 transition-colors duration-300 ${passwordCriteria.symbol ? 'text-green-600' : 'text-gray-400'}`}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={passwordCriteria.symbol ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      Contains at least one symbol (e.g. !@#$)
                    </li>
                    <li className={`flex items-center gap-2.5 transition-colors duration-300 ${passwordCriteria.number ? 'text-green-600' : 'text-gray-400'}`}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={passwordCriteria.number ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      Contains at least one number
                    </li>
                    <li className={`flex items-center gap-2.5 transition-colors duration-300 ${passwordCriteria.length ? 'text-green-600' : 'text-gray-400'}`}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={passwordCriteria.length ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      Minimum 8 characters long
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1.5">Confirm Password</label>
              <input 
                type="password" 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none text-sm transition-colors placeholder-gray-400"
              />
            </div>

            <div className="pt-3">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 rounded bg-green-600 hover:bg-green-700 text-sm font-bold text-white transition-colors focus:outline-none disabled:bg-gray-400"
              >
                {loading ? `Creating account ${loadingDots}` : 'CREATE ACCOUNT'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-green-600 hover:text-green-700 hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>

        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative bg-green-600 flex-col items-center pt-20 overflow-hidden h-full">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay"
          style={{ backgroundImage: `url('/body.jpeg')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/90 to-green-800/90"></div>
        
        <div className="relative z-20 flex flex-col items-center text-center w-full max-w-lg px-8 drop-shadow-md">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Effortlessly manage your internship journey.
          </h1>
          <p className="text-green-100 text-lg">
            Log in to access your dashboard and track your professional progress.
          </p>
        </div>

        <div className="absolute bottom-0 w-full flex justify-center z-10 pointer-events-none">
          <img 
            src="/person.png" 
            alt="Professional Intern"
            draggable="false"
            className="w-[115%] max-w-2xl h-auto object-cover translate-y-[60%]"
          />
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center transform transition-all scale-100">
            
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-[bounceIn_0.5s_ease-out]">
              <svg 
                className="w-10 h-10 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="3" 
                  d="M5 13l4 4L19 7" 
                  className="animate-[drawCheck_0.6s_ease-in-out_forwards]"
                  style={{
                    strokeDasharray: 50,
                    strokeDashoffset: 50,
                  }}
                />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">Account Created!</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Your account has been successfully registered. You can now log in to access your account.
            </p>
            
            <button
              onClick={handleCloseModal}
              className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              PROCEED TO LOGIN
            </button>
          </div>

          <style>{`
            @keyframes drawCheck {
              to {
                stroke-dashoffset: 0;
              }
            }
            @keyframes bounceIn {
              0% {
                transform: scale(0);
                opacity: 0;
              }
              60% {
                transform: scale(1.15);
                opacity: 1;
              }
              100% {
                transform: scale(1);
              }
            }
            .animate-fade-in {
              animation: fadeIn 0.3s ease-in-out;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

    </div>
  );
}

export default Sign;