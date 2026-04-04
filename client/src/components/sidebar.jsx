import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 

  History, 
  User, 
  Settings, 
  LogOut, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as Icons from "lucide-react";
import { motion } from 'motion/react';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: "/" },
  { name: 'RepositoryUpload', icon: Icons.GitBranch, path: "/" },
  { name: 'History', icon: History, path: "/history" },
  { name: 'Profile', icon: User, path: "/profile" },
];

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState('Analyze');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const navigate = useNavigate();

  const sidebarVariants = {
    expanded: { width: '220px' },
    collapsed: { width: '78px' },
  };

  const itemVariants = {
    expanded: { opacity: 1, x: 0, display: 'block' },
    collapsed: { opacity: 0, x: -10, transitionEnd: { display: 'none' } },
  };

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '78px' : '260px'
    );

    return () => {
      document.documentElement.style.setProperty('--sidebar-width', '78px');
    };
  }, [isCollapsed]);

  return (
    <motion.div
      className="fixed left-0 top-0 h-full bg-[#080b14] border-r border-white/5 flex flex-col z-50 shadow-2xl"
      initial="collapsed"
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="relative flex flex-col h-full py-4">
        
        <div className="px-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.3)] shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-white tracking-tight whitespace-nowrap"
              >
                RepoXray
              </motion.span>
            )}
          </div>
          
          <button 
            onClick={() => {
  setActiveItem(item.name);
  navigate(item.path);
}}
            className="absolute -right-3 top-6 w-6 h-6 rounded-md bg-[#161b2c] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/50 transition-all shadow-lg z-50"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeItem === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
  setActiveItem(item.name);
  navigate(item.path);
}}
                className={`relative w-full flex items-center h-12 rounded-lg transition-all duration-200 group
                  ${isActive ? 'bg-purple-500/10 text-cyan-400' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}
                `}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                  />
                )}
                
                <div className={`flex items-center justify-center shrink-0 ${isCollapsed ? 'w-full' : 'w-14'}`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>

                <motion.span
                  variants={itemVariants}
                  className="font-medium text-sm whitespace-nowrap"
                >
                  {item.name}
                </motion.span>

                {isCollapsed && (
                  <div className="absolute left-16 px-2 py-1 bg-[#161b2c] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white/10 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pt-4 mt-4 border-t border-white/5 space-y-1">
          <button className="w-full flex items-center h-12 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all group">
            <div className={`flex items-center justify-center shrink-0 ${isCollapsed ? 'w-full' : 'w-14'}`}>
              <Settings size={22} />
            </div>
            <motion.span variants={itemVariants} className="font-medium text-sm">Settings</motion.span>
          </button>
          
          <button className="w-full flex items-center h-12 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all group">
            <div className={`flex items-center justify-center shrink-0 ${isCollapsed ? 'w-full' : 'w-14'}`}>
              <LogOut size={22} />
            </div>
            <motion.span variants={itemVariants} className="font-medium text-sm">Logout</motion.span>
          </button>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
};

export default Sidebar;