'use client';

import React from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your preferences</p>
          </div>

          {/* Appearance Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Appearance
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">Theme</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Choose between light and dark mode
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Sun size={18} />
                    Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Moon size={18} />
                    Dark
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              System Information
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-700 dark:text-gray-300">Application Version</p>
                <p className="text-gray-600 dark:text-gray-400">1.0.0</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-gray-700 dark:text-gray-300">Database Status</p>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-gray-700 dark:text-gray-300">API Status</p>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Running
                </span>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Help & Support
            </h3>

            <div className="space-y-3">
              <a
                href="#"
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <p className="text-gray-900 dark:text-white font-medium">Documentation</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Read the complete HR System documentation
                </p>
              </a>

              <a
                href="#"
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <p className="text-gray-900 dark:text-white font-medium">Contact Support</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Get help from our support team
                </p>
              </a>

              <a
                href="#"
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <p className="text-gray-900 dark:text-white font-medium">Report a Bug</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Help us improve by reporting issues
                </p>
              </a>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
