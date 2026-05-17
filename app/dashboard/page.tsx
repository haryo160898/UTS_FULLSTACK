'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, Building2, UserCheck, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalUsers: number;
  totalDivisions: number;
}

interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  division?: string;
  position?: string;
  employment_status?: string;
  join_date?: string;
}

interface ChartData {
  month?: string;
  year?: number;
  count: number;
  division?: string;
  name?: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalUsers: 0,
    totalDivisions: 0,
  });
  const [recentEmployees, setRecentEmployees] = useState<Employee[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotalPages, setRecentTotalPages] = useState(1);
  const [recentLimit] = useState(10);
  const [recentTotal, setRecentTotal] = useState(0);
  const [growthData, setGrowthData] = useState<ChartData[]>([]);
  const [divisionData, setDivisionData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const formatMonthLabel = (value: string) => {
    const [year, month] = value?.split('-') || [];
    if (!year || !month) return value;
    return `${month}/${year.slice(-2)}`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [statsRes, growthRes, divisionsRes] = await Promise.allSettled([
          axios.get(`${apiUrl}/api/dashboard/stats`, config),
          axios.get(`${apiUrl}/api/dashboard/growth`, config),
          axios.get(`${apiUrl}/api/dashboard/divisions`, config),
        ]);

        if (statsRes.status === 'fulfilled') {
          setStats({
            totalEmployees: statsRes.value.data.totalEmployees ?? 0,
            activeEmployees: statsRes.value.data.activeEmployees ?? 0,
            totalUsers: statsRes.value.data.totalUsers ?? 0,
            totalDivisions: statsRes.value.data.totalDivisions ?? statsRes.value.data.divisions ?? 0,
          });
        } else {
          console.error('Dashboard stats failed:', statsRes.reason?.response?.data || statsRes.reason);
        }

        if (growthRes.status === 'fulfilled') {
          setGrowthData(Array.isArray(growthRes.value.data) ? growthRes.value.data : []);
        } else {
          console.error('Growth data failed:', growthRes.reason?.response?.data || growthRes.reason);
        }

        if (divisionsRes.status === 'fulfilled') {
          setDivisionData(Array.isArray(divisionsRes.value.data) ? divisionsRes.value.data : []);
        } else {
          console.error('Division data failed:', divisionsRes.reason?.response?.data || divisionsRes.reason);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const sortByEmployeeCode = (employees: Employee[]) => {
    return [...employees].sort((a, b) => {
      if (a.employee_code < b.employee_code) return -1;
      if (a.employee_code > b.employee_code) return 1;
      return 0;
    });
  };

  useEffect(() => {
    const fetchRecentEmployees = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const response = await axios.get(`${apiUrl}/api/dashboard/recent`, {
          ...config,
          params: { page: recentPage, limit: recentLimit },
        });

        const fetchedEmployees = response.data.data || [];
        setRecentEmployees(sortByEmployeeCode(fetchedEmployees));
        setRecentTotal(response.data.total || 0);
        setRecentTotalPages(response.data.pages || 1);
      } catch (error) {
        console.error('Recent employees failed:', error);
        toast.error('Failed to load recent employees');
      }
    };

    fetchRecentEmployees();
  }, [recentPage, recentLimit]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome to HR Management System</p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                label: 'Total Employees',
                value: stats.totalEmployees,
                bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                iconColor: 'text-blue-600 dark:text-blue-400',
              },
              {
                icon: Building2,
                label: 'Total Divisions',
                value: stats.totalDivisions,
                bgColor: 'bg-purple-100 dark:bg-purple-900/30',
                iconColor: 'text-purple-600 dark:text-purple-400',
              },
              {
                icon: UserCheck,
                label: 'Active Employees',
                value: stats.activeEmployees,
                bgColor: 'bg-green-100 dark:bg-green-900/30',
                iconColor: 'text-green-600 dark:text-green-400',
              },
              {
                icon: LayoutGrid,
                label: 'Total Users',
                value: stats.totalUsers,
                bgColor: 'bg-orange-100 dark:bg-orange-900/30',
                iconColor: 'text-orange-600 dark:text-orange-400',
              },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Growth Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Employee Growth
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" tickFormatter={formatMonthLabel} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    labelFormatter={formatMonthLabel}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Division Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Division Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={divisionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ payload }) => payload?.division ?? ''}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {divisionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Employees */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Employees
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Employee Code</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Division</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Position</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Join Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmployees.length > 0 ? (
                    recentEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{emp.employee_code}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{emp.full_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{emp.division || '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{emp.position || '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{emp.employment_status || '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No recent employees available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <p>
                Showing page {recentPage} of {recentTotalPages} — {recentTotal} employees
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={recentPage <= 1}
                  onClick={() => setRecentPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={recentPage >= recentTotalPages}
                  onClick={() => setRecentPage((prev) => Math.min(prev + 1, recentTotalPages))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
