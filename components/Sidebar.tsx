
import React from 'react';
import { BookOpen, BarChart2, Grid, Upload, FileText, Download, FolderGit2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  docsCount: number;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isDesktopCollapsed: boolean;
  setIsDesktopCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  docsCount, 
  isMobileOpen, 
  setIsMobileOpen,
  isDesktopCollapsed,
  setIsDesktopCollapsed
}) => {
  const menuItems = [
    { id: 'upload', label: 'Tải lên & Danh sách', icon: <Upload size={22} /> },
    { id: 'folders', label: 'Thư mục Thông minh', icon: <FolderGit2 size={22} /> },
    { id: 'analysis', label: 'Phân tích Chi tiết', icon: <FileText size={22} /> },
    { id: 'bibliometric', label: 'Trắc lượng Thư mục', icon: <BarChart2 size={22} /> },
    { id: 'matrix', label: 'Ma trận Tổng quan', icon: <Grid size={22} /> },
    { id: 'export', label: 'Xuất Dữ liệu', icon: <Download size={22} /> },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 z-50 h-full bg-slate-900 text-slate-300 shadow-2xl 
        transition-all duration-300 ease-in-out border-r border-slate-800
        ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
        ${isDesktopCollapsed ? 'md:w-20' : 'md:w-72'}
      `}>
        <div className="flex flex-col h-full relative">
            
          {/* Desktop Toggle Button */}
          <button 
             onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
             className="hidden md:flex absolute -right-3 top-9 w-6 h-6 bg-blue-600 border border-slate-700 text-white rounded-full items-center justify-center hover:bg-blue-500 shadow-lg z-50 transition-transform hover:scale-110"
          >
             {isDesktopCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Header */}
          <div className={`flex items-center ${isDesktopCollapsed ? 'justify-center px-0' : 'justify-between px-6'} h-20 border-b border-slate-800 transition-all`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-xl shadow-lg shadow-blue-900/50 shrink-0">
                <BookOpen className="text-white" size={24} />
              </div>
              
              <div className={`transition-all duration-300 ${isDesktopCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none whitespace-nowrap">Insight Scholar</h1>
                <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Research AI</p>
              </div>
            </div>
            
            {/* Mobile Close Button */}
            <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden px-3">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileOpen(false); 
                  }}
                  title={isDesktopCollapsed ? item.label : ''} // Tooltip logic for collapsed state
                  className={`
                    w-full flex items-center relative transition-all duration-200 group
                    ${isDesktopCollapsed ? 'justify-center px-0 py-3 rounded-xl' : 'justify-start px-4 py-3.5 rounded-xl gap-3'}
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                      : 'hover:bg-slate-800 hover:text-white text-slate-400'}
                  `}
                >
                  <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-200'} transition-colors shrink-0`}>
                      {item.icon}
                  </span>
                  
                  <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${isDesktopCollapsed ? 'w-0 opacity-0 overflow-hidden absolute' : 'w-auto opacity-100 static'}`}>
                    {item.label}
                  </span>
                  
                  {/* Counter Badge */}
                  {item.id === 'upload' && docsCount > 0 && (
                    <span className={`
                        absolute flex items-center justify-center font-bold shadow-sm
                        ${isDesktopCollapsed 
                            ? 'top-1 right-1 w-4 h-4 text-[9px] bg-red-500 text-white rounded-full' 
                            : 'right-3 text-xs px-2 py-0.5 rounded-md bg-slate-800 text-blue-400 group-hover:bg-slate-900'}
                         ${isActive && !isDesktopCollapsed ? 'bg-white/20 text-white' : ''}
                    `}>
                      {docsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <div className={`bg-slate-800/50 rounded-xl p-3 text-xs text-slate-500 text-center border border-slate-800 transition-all overflow-hidden ${isDesktopCollapsed ? 'opacity-0 h-0 p-0 border-0' : 'opacity-100 h-auto'}`}>
              <p>Powered by <span className="text-blue-400 font-bold">Gemini 2.5</span></p>
              <p className="mt-1 opacity-60">© 2024 Insight Scholar v2.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
