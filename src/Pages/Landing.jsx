import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleScroll = (e) => {
    setScrollY(e.target.scrollTop);
  };

  const scrollToSection = (sectionId) => {
    setIsMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div 
      onScroll={handleScroll}
      className="h-screen overflow-y-auto bg-white relative flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth select-none"
    >
      <header className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            
            <div 
              className="flex-shrink-0 flex items-center cursor-pointer"
              onClick={() => scrollToSection('home')}
            >
              <img 
                src="/logo.png" 
                alt="InternTrack Logo" 
                draggable="false"
                className="h-6 sm:h-7 w-auto object-contain"
              />
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <nav className="flex items-center space-x-6 mr-2">
                <button 
                  onClick={() => scrollToSection('home')} 
                  className="text-gray-600 hover:text-green-600 font-medium text-sm transition-colors duration-200 focus:outline-none"
                >
                  Home
                </button>
                <button 
                  onClick={() => scrollToSection('about')} 
                  className="text-gray-600 hover:text-green-600 font-medium text-sm transition-colors duration-200 focus:outline-none"
                >
                  About
                </button>
                <button 
                  onClick={() => scrollToSection('features')} 
                  className="text-gray-600 hover:text-green-600 font-medium text-sm transition-colors duration-200 focus:outline-none"
                >
                  Features
                </button>
              </nav>

              <Link to="/login">
                <button className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm transition-all duration-200">
                  Login
                </button>
              </Link>
            </div>

            <div className="flex md:hidden items-center">
              <button 
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-green-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 transition-colors"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <svg className="block h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-xl z-50">
            <div className="px-4 pt-2 pb-4 space-y-1 sm:px-3">
              <button 
                onClick={() => scrollToSection('home')} 
                className="block w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('about')} 
                className="block w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection('features')} 
                className="block w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                Features
              </button>
              <div className="pt-4 pb-2 border-t border-gray-100">
                <Link to="/login" className="block w-full">
                  <button className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-colors shadow-sm">
                    Login
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <div id="home" className="relative min-h-screen flex flex-col pt-14 overflow-hidden shrink-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: `url('/body.jpeg')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/85 to-green-800/90"></div>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-12 md:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-8 md:gap-12">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-4 mb-2 justify-center md:justify-start">
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white drop-shadow-lg tracking-wide">
                  SIMPLIFY
                </h1>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium text-white drop-shadow-lg">
                  your
                </h1>
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-yellow-300 mb-2 drop-shadow-lg tracking-wide">
                Internship Experience
              </h1>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">
                with <span className="text-yellow-300">InternTrack</span>
              </h1>
              
              <p className="text-base sm:text-lg text-white/95 max-w-2xl leading-relaxed drop-shadow-md mx-auto md:mx-0">
                InternTrack is your all-in-one platform to manage, monitor, and optimize your internship 
                and receive real-time feedback ensuring you stay on top of your progress while gaining 
                valuable professional experience.
              </p>

              <div className="mt-8">
                <Link to="/sign">
                  <button className="px-8 py-3.5 bg-white text-green-700 rounded-lg hover:bg-green-50 transition-colors shadow-xl font-bold text-lg focus:outline-none focus:ring-4 focus:ring-green-500/50">
                    Sign in
                  </button>
                </Link>
              </div>

             
            </div>

            <div className="hidden md:flex flex-1 justify-center md:justify-end">
              <img 
                src="/person.png" 
                alt="Professional Intern" 
                draggable="false"
                className="max-w-full h-auto max-h-[450px] sm:max-h-[550px] md:max-h-[650px] object-contain drop-shadow-2xl"
                style={{ 
                  transform: `translateY(${scrollY * 0.45}px)`,
                  willChange: 'transform'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <section id="about" className="w-full bg-white py-24 px-4 sm:px-6 lg:px-8 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-50">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-green-100 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -right-24 w-80 h-80 bg-yellow-50 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">About InternTrack</h2>
          <div className="w-24 h-1.5 bg-green-600 mx-auto rounded-full mb-10"></div>
          
          <div className="bg-white/80 backdrop-blur-sm p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100 max-w-3xl mx-auto transition-transform hover:-translate-y-1 duration-300">
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              Designed to maximize your learning experience. InternTrack helps interns and companies track 
              progress efficiently in one centralized platform.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="w-full bg-green-700 py-24 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Features</h2>
            <div className="w-24 h-1.5 bg-yellow-300 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 group cursor-default">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-green-600 transition-colors duration-300">
                <svg className="w-8 h-8 text-green-600 group-hover:text-white group-hover:animate-bounce transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-4">Track Hours</h3>
              <p className="text-gray-600 text-center text-sm leading-relaxed">
                Log and monitor your internship hours efficiently with automated summaries and reports.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 group cursor-default">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-green-600 transition-colors duration-300">
                <svg className="w-8 h-8 text-green-600 group-hover:text-white group-hover:animate-bounce transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-4">Log Tasks</h3>
              <p className="text-gray-600 text-center text-sm leading-relaxed">
                Keep track of your daily tasks and projects in one organized dashboard for productivity.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 group cursor-default">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-green-600 transition-colors duration-300">
                <svg className="w-8 h-8 text-green-600 group-hover:text-white group-hover:animate-bounce transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-4">Receive Feedback</h3>
              <p className="text-gray-600 text-center text-sm leading-relaxed">
                Get real-time feedback from supervisors to improve your skills and performance.
              </p>
            </div>

          </div>
        </div>
      </section>

      <footer className="w-full bg-white border-t border-gray-200 py-6 px-4 shrink-0">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500 text-sm font-medium">
            © 2026 InternTrack. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}

export default Landing;