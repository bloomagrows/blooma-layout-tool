import React from 'react';
import { plantIcons } from '../utils/plantIcons';

const DebugInfo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-spring-leaf-50 to-cornflower-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-display text-forest-800 mb-8">Plant Icons Debug Info</h1>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-spring-leaf-200 p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(plantIcons).map(([name, { icon: Icon, color, name: displayName }]) => (
              <div 
                key={name}
                className="p-4 bg-spring-leaf-50 rounded-xl border border-spring-leaf-200 flex items-start space-x-3"
              >
                <div className={`p-2 rounded-lg bg-white ${color}`}>
                  <Icon className="w-6 h-6" weight="duotone" />
                </div>
                <div>
                  <div className="font-medium text-forest-800">{name}</div>
                  <div className="text-sm text-forest-600">{displayName}</div>
                  <div className="text-xs text-forest-500 mt-1 font-mono">{color}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugInfo;