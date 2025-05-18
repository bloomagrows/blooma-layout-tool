import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Calendar, Clock, User, Layout, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface Session {
  id: string;
  session_id: string;
  growing_zone: number;
  garden_width: number;
  garden_height: number;
  selected_plants: string[];
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  user_agent: string;
  screen_size: { width: number; height: number };
}

interface Step {
  id: string;
  session_id: string;
  step_number: number;
  step_name: string;
  user_input: any;
  ai_recommendations: any;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number;
  success: boolean;
}

interface Layout {
  id: string;
  session_id: string;
  layout_data: any;
  layout_type: 'ai_generated' | 'user_modified';
  created_at: string;
}

const ADMIN_PASSWORD = 'blooma2024';

const AdminPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionSteps, setSessionSteps] = useState<Record<string, Step[]>>({});
  const [sessionLayouts, setSessionLayouts] = useState<Record<string, Layout[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuth', 'true');
    } else {
      setError('Invalid password');
    }
  };

  useEffect(() => {
    const isAuth = localStorage.getItem('adminAuth') === 'true';
    setIsAuthenticated(isAuth);

    if (isAuth) {
      fetchSessions();
    }
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('onboarding_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData);
    } catch (err) {
      setError('Error fetching sessions');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      // Fetch steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('session_id', sessionId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      // Fetch layouts
      const { data: layoutsData, error: layoutsError } = await supabase
        .from('garden_layouts_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (layoutsError) throw layoutsError;

      setSessionSteps(prev => ({ ...prev, [sessionId]: stepsData }));
      setSessionLayouts(prev => ({ ...prev, [sessionId]: layoutsData }));
    } catch (err) {
      console.error('Error fetching session details:', err);
    }
  };

  const toggleSession = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      if (!sessionSteps[sessionId]) {
        fetchSessionDetails(sessionId);
      }
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-spring-leaf-50 to-cornflower-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-spring-leaf-200 w-full max-w-md">
          <h1 className="text-2xl font-display text-forest-800 mb-6">Admin Portal</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-forest-600 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 bg-spring-leaf-50 border border-spring-leaf-200 rounded-xl text-forest-800 focus:ring-2 focus:ring-spring-leaf-500/50"
              />
            </div>
            {error && (
              <p className="text-sm text-heirloom-600">{error}</p>
            )}
            <button
              onClick={handleLogin}
              className="w-full px-6 py-3 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors font-medium shadow-lg shadow-spring-leaf-500/20"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-spring-leaf-50 to-cornflower-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display text-forest-800">Onboarding Sessions</h1>
          <button
            onClick={() => {
              localStorage.removeItem('adminAuth');
              setIsAuthenticated(false);
            }}
            className="px-4 py-2 bg-spring-leaf-50 text-forest-600 rounded-full hover:bg-spring-leaf-100 transition-colors border border-spring-leaf-200"
          >
            Logout
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-spring-leaf-500 border-t-transparent mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-2xl border border-spring-leaf-200 overflow-hidden">
                <button
                  onClick={() => toggleSession(session.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-spring-leaf-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      session.status === 'completed' 
                        ? 'bg-spring-leaf-100 text-spring-leaf-600'
                        : session.status === 'abandoned'
                        ? 'bg-heirloom-100 text-heirloom-600'
                        : 'bg-cornflower-100 text-cornflower-600'
                    }`}>
                      {session.status === 'completed' 
                        ? <CheckCircle className="w-5 h-5" />
                        : session.status === 'abandoned'
                        ? <XCircle className="w-5 h-5" />
                        : <Clock className="w-5 h-5" />
                      }
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-forest-800">
                        Session {session.session_id.slice(-6)}
                      </div>
                      <div className="text-sm text-forest-600">
                        Started {formatDate(session.started_at)}
                      </div>
                    </div>
                  </div>
                  {expandedSession === session.id 
                    ? <ChevronDown className="w-5 h-5 text-forest-600" />
                    : <ChevronRight className="w-5 h-5 text-forest-600" />
                  }
                </button>

                {expandedSession === session.id && (
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-spring-leaf-50 rounded-xl border border-spring-leaf-200">
                        <div className="text-sm text-forest-600 mb-1">Growing Zone</div>
                        <div className="text-lg font-medium text-forest-800">
                          {session.growing_zone || 'Not set'}
                        </div>
                      </div>
                      <div className="p-4 bg-spring-leaf-50 rounded-xl border border-spring-leaf-200">
                        <div className="text-sm text-forest-600 mb-1">Garden Size</div>
                        <div className="text-lg font-medium text-forest-800">
                          {session.garden_width && session.garden_height
                            ? `${session.garden_width}' × ${session.garden_height}'`
                            : 'Not set'
                          }
                        </div>
                      </div>
                      <div className="p-4 bg-spring-leaf-50 rounded-xl border border-spring-leaf-200">
                        <div className="text-sm text-forest-600 mb-1">Selected Plants</div>
                        <div className="text-lg font-medium text-forest-800">
                          {session.selected_plants?.length || 0}
                        </div>
                      </div>
                      <div className="p-4 bg-spring-leaf-50 rounded-xl border border-spring-leaf-200">
                        <div className="text-sm text-forest-600 mb-1">Time Spent</div>
                        <div className="text-lg font-medium text-forest-800">
                          {session.completed_at
                            ? formatDuration(Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000))
                            : 'In progress'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Steps Timeline */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-forest-800 mb-4">Steps Timeline</h3>
                      <div className="space-y-4">
                        {sessionSteps[session.id]?.map((step) => (
                          <div key={step.id} className="p-4 bg-white rounded-xl border border-spring-leaf-200">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium text-forest-800">
                                  {step.step_name}
                                </div>
                                <div className="text-sm text-forest-600">
                                  Time spent: {formatDuration(step.time_spent_seconds)}
                                </div>
                              </div>
                              {step.success ? (
                                <div className="text-spring-leaf-500">
                                  <CheckCircle className="w-5 h-5" />
                                </div>
                              ) : (
                                <div className="text-heirloom-500">
                                  <XCircle className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            {(step.user_input || step.ai_recommendations) && (
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {step.user_input && (
                                  <div className="p-3 bg-spring-leaf-50 rounded-lg text-sm">
                                    <div className="text-forest-600 mb-1">User Input:</div>
                                    <pre className="text-forest-800 whitespace-pre-wrap">
                                      {JSON.stringify(step.user_input, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {step.ai_recommendations && (
                                  <div className="p-3 bg-cornflower-50 rounded-lg text-sm">
                                    <div className="text-forest-600 mb-1">AI Recommendations:</div>
                                    <pre className="text-forest-800 whitespace-pre-wrap">
                                      {JSON.stringify(step.ai_recommendations, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Garden Layouts */}
                    <div>
                      <h3 className="text-lg font-medium text-forest-800 mb-4">Garden Layouts</h3>
                      <div className="space-y-4">
                        {sessionLayouts[session.id]?.map((layout) => (
                          <div key={layout.id} className="p-4 bg-white rounded-xl border border-spring-leaf-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-forest-800">
                                {layout.layout_type === 'ai_generated' ? 'AI Generated Layout' : 'User Modified Layout'}
                              </div>
                              <div className="text-sm text-forest-600">
                                {formatDate(layout.created_at)}
                              </div>
                            </div>
                            <pre className="mt-4 p-3 bg-spring-leaf-50 rounded-lg text-sm text-forest-800 whitespace-pre-wrap">
                              {JSON.stringify(layout.layout_data, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPortal;