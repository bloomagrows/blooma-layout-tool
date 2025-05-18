import React from 'react';
import { History, CheckCircle, XCircle, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { supabase, safeStorage } from '../../utils/supabase';

interface GardenHistory {
  id: string;
  layout_data: any;
  layout_type: 'ai_generated' | 'user_modified';
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  session_id: string;
  generation_id?: string;
  paid?: boolean;
}

interface GardenHistoryProps {
  history: GardenHistory[];
  onSelectLayout: (layout: GardenHistory) => void;
  onDelete?: (layoutId: string) => void;
}

const GardenHistory: React.FC<GardenHistoryProps> = ({ history, onSelectLayout, onDelete }) => {
  if (!history || history.length === 0) return null;

  const handleDelete = async (e: React.MouseEvent, layout: GardenHistory) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this garden layout?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('garden_layouts_history')
        .delete()
        .eq('id', layout.id)
        .eq('session_id', layout.session_id);

      if (deleteError) {
        throw deleteError;
      }
      
      onDelete?.(layout.id);
    } catch (error) {
      console.error('Error deleting garden layout:', error);
      alert('Failed to delete garden layout. Please try again.');
    }
  };

  const handleLayoutClick = (layout: GardenHistory) => {
    if (isLayoutSelectable(layout)) {
      console.log("LAYOUT ID" + layout.generation_id);
      // Store the layout ID in storage for WebContainer environment
      safeStorage.setItem('current_layout_id', layout.generation_id || '');
      
      // In WebContainer, we need to handle navigation differently
      if (window.location.hostname === 'webcontainer.io') {
        // Update the URL without triggering a page reload
        window.history.pushState({}, '', `/g?id=${layout.generation_id}`);
        // Force a page reload to ensure proper state reset
        window.location.reload();
      } else {
        // Normal browser navigation
        window.location.href = `/g?id=${layout.generation_id}`;
      }
    }
  };

  const isLayoutSelectable = (layout: GardenHistory) => {
    // Layout is selectable if it's completed, regardless of payment status
    // Payment will be handled on the garden page
    return layout.status === 'completed';
  };

  const getLayoutInfo = (layout: GardenHistory) => {
    const plants = layout.layout_data?.plants || [];
    const width = layout.layout_data?.width || 0;
    const height = layout.layout_data?.height || 0;
    return { plants, width, height };
  };

  return (
    <div className="mt-12 text-left">
      <h3 className="text-xl font-display text-forest-800 mb-4 flex items-center gap-2">
        <History className="w-5 h-5" />
        <span>Your Garden History</span>
      </h3>
      <div className="space-y-3">
        {history.map((layout) => {
          const selectable = isLayoutSelectable(layout);
          const { plants, width, height } = getLayoutInfo(layout);
          const area = width * height;
          const requiresPayment = area >= 64;
          
          return (
            <div
              key={layout.id}
              onClick={() => handleLayoutClick(layout)}
              className={`w-full p-4 bg-white rounded-xl border transition-colors text-left group relative ${
                selectable
                  ? 'border-spring-leaf-200 hover:border-spring-leaf-300 cursor-pointer'
                  : 'border-spring-leaf-100 opacity-75 cursor-default'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {layout.status === 'completed' ? (
                    <div className="p-2 rounded-full bg-spring-leaf-100 text-spring-leaf-600">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  ) : layout.status === 'failed' ? (
                    <div className="p-2 rounded-full bg-heirloom-100 text-heirloom-600">
                      <XCircle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-cornflower-100 text-cornflower-600">
                      <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-forest-800">
                      {plants.length} Plants • {width}' × {height}' Garden
                      {requiresPayment && !layout.paid && (
                        <span className="ml-2 text-xs text-heirloom-600">
                          • Pro Layout
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-forest-600">
                      Created {new Date(layout.created_at).toLocaleDateString()}
                      {!selectable && (
                        <span className="ml-2 text-cornflower-600">
                          • {layout.status === 'processing' ? 'Generating...' : 'Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    onClick={(e) => handleDelete(e, layout)}
                    className="p-2 rounded-lg hover:bg-heirloom-50 text-heirloom-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Delete garden"
                  >
                    <Trash2 className="w-5 h-5" />
                  </div>
                  {selectable && (
                    <div className="text-spring-leaf-500">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Status tooltip for non-selectable layouts */}
              {!selectable && (
                <div className="absolute inset-x-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-white px-4 py-2 rounded-xl shadow-lg text-sm text-forest-600 border border-spring-leaf-200 mx-4">
                    {layout.status === 'processing' 
                      ? 'This layout is currently being generated. Please wait...'
                      : layout.status === 'pending'
                      ? 'This layout is pending generation'
                      : 'This layout failed to generate'
                    }
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GardenHistory;