import React from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';

interface DebugEntry {
  timestamp: number;
  prompt: string;
  response: string;
  error?: string;
  details?: Record<string, any>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface DebugPanelProps {
  entries: DebugEntry[];
  onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ entries, onClose }) => {
  const [expandedDetails, setExpandedDetails] = React.useState<number[]>([]);

  const toggleDetails = (index: number) => {
    setExpandedDetails(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white/95 backdrop-blur-sm border-l border-spring-leaf-200 text-forest-800 overflow-y-auto shadow-xl">
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-spring-leaf-200 p-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-forest-800">OpenAI Debug Panel</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-spring-leaf-50 rounded-lg transition-colors text-forest-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 space-y-6">
        {entries.length === 0 ? (
          <p className="text-forest-500 text-center py-8">No API calls yet</p>
        ) : (
          entries.map((entry, index) => (
            <div key={entry.timestamp} className="space-y-3">
              <div className="text-xs text-forest-500">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
              
              <div className="space-y-2">
                <div className="bg-spring-leaf-50 rounded-lg p-3">
                  <div className="text-xs text-forest-500 mb-1">Prompt:</div>
                  <pre className="text-sm text-forest-700 whitespace-pre-wrap">{entry.prompt}</pre>
                </div>
                
                {entry.response && (
                  <div className="bg-spring-leaf-50 rounded-lg p-3">
                    <div className="text-xs text-forest-500 mb-1">Response:</div>
                    <pre className="text-sm text-forest-700 whitespace-pre-wrap">{entry.response}</pre>
                  </div>
                )}
                
                {entry.error && (
                  <div className="bg-heirloom-50 border border-heirloom-200 rounded-lg p-3">
                    <div className="text-xs text-heirloom-600 mb-1">Error:</div>
                    <pre className="text-sm text-heirloom-700 whitespace-pre-wrap">{entry.error}</pre>
                  </div>
                )}

                {entry.usage && (
                  <div className="bg-cornflower-50 border border-cornflower-200 rounded-lg p-3">
                    <div className="text-xs text-cornflower-600 mb-1">Token Usage:</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-cornflower-600">Prompt:</span>
                        <span className="text-cornflower-700 ml-1">{entry.usage.promptTokens}</span>
                      </div>
                      <div>
                        <span className="text-cornflower-600">Completion:</span>
                        <span className="text-cornflower-700 ml-1">{entry.usage.completionTokens}</span>
                      </div>
                      <div>
                        <span className="text-cornflower-600">Total:</span>
                        <span className="text-cornflower-700 ml-1">{entry.usage.totalTokens}</span>
                      </div>
                    </div>
                  </div>
                )}

                {entry.details && (
                  <div className="bg-spring-leaf-50 rounded-lg">
                    <button
                      onClick={() => toggleDetails(index)}
                      className="w-full p-3 flex items-center justify-between text-left hover:bg-spring-leaf-100 transition-colors rounded-lg"
                    >
                      <span className="text-xs text-forest-500">Details</span>
                      {expandedDetails.includes(index) ? (
                        <ChevronDown className="w-4 h-4 text-forest-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-forest-500" />
                      )}
                    </button>
                    
                    {expandedDetails.includes(index) && (
                      <div className="p-3 pt-0 border-t border-spring-leaf-100">
                        <pre className="text-sm text-forest-700 whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {index < entries.length - 1 && (
                <hr className="border-spring-leaf-100" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DebugPanel;