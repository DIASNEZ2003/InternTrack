import React from 'react';
import { motion } from 'framer-motion';

function AnimatedLogos() {
  const departments = [
    { id: 1, name: 'CCS', image: '/ccs.png' }, 
    { id: 2, name: 'EDUC', image: '/educ.png' },
    { id: 3, name: 'HM', image: '/hm.png' },
    { id: 4, name: 'AGRI', image: '/agri.png' },
    { id: 5, name: 'CRIM', image: '/crim.png' },
  ];

  return (
    <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-[600px] px-4 pt-10 select-none overflow-hidden">
      
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-16 drop-shadow-[0_5px_5px_rgba(0,0,0,0.4)] text-center uppercase tracking-widest">
        Choose your department
      </h1>

      <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 w-full max-w-7xl">
        
        {departments.map((dept, index) => (
          <motion.div
            key={dept.id}
            className="group flex flex-col items-center justify-center w-40 h-40 sm:w-56 sm:h-56 bg-white rounded-full shadow-xl border-4 border-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"

            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ 
              duration: 0.4,       // Super fast fade in
              ease: "easeOut",     // Smooth transition
              delay: index * 0.1   // Quick stagger effect from left to right
            }}
          >
            {dept.image ? (
              <img 
                src={dept.image} 
                alt={`${dept.name} logo`} 
                draggable="false"
                className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300" 
              />
            ) : (
              <span className="text-xl sm:text-2xl font-bold text-green-700 text-center leading-tight px-4">
                {dept.name}
              </span>
            )}
          </motion.div>
        ))}
        
      </div>
    </div>
  );
}

export default AnimatedLogos;