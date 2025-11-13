import React from 'react';

function AdminOnly({ children, isAdmin }) {
  if (!isAdmin) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gray-100 opacity-50 z-10 rounded-lg"></div>
        <div className="relative z-20 opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            Modo Visualização
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default AdminOnly;
