import React, { useState } from 'react';
import { Mail, X } from 'lucide-react';

interface EmailNotificationProps {
  onSubmit: (email: string | null) => void;
  onClose: () => void;
}

const EmailNotification: React.FC<EmailNotificationProps> = ({ onSubmit, onClose }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    onSubmit(email || null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-spring-leaf-200 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display text-forest-800">Get Notified When Ready</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-spring-leaf-50 rounded-lg transition-colors text-forest-600 hover:text-forest-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-forest-600 mb-6">
          Your garden layout will take a few minutes to generate. Would you like us to notify you by email when it's ready?
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-forest-600 mb-2">
              Email Address (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="Enter your email"
              className="w-full px-4 py-3 bg-spring-leaf-50 border border-spring-leaf-200 rounded-xl text-forest-800 placeholder:text-forest-400 focus:ring-2 focus:ring-spring-leaf-500/50"
            />
            {error && (
              <p className="mt-2 text-sm text-heirloom-600">{error}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors font-medium shadow-lg shadow-spring-leaf-500/20"
            >
              {email ? (
                <span className="flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  Notify Me
                </span>
              ) : (
                "No Thanks, I'll Wait"
              )}
            </button>
          </div>

          <p className="text-sm text-forest-500 text-center">
            You can safely close this window. Your layout will be saved in your garden history.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailNotification;