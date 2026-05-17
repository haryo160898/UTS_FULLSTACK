'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  gender: string;
  email: string;
  phone_number: string;
  division: string;
  position: string;
  employment_status: string;
  join_date: string;
  profile_photo?: string;
}

interface ListResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [divisions, setDivisions] = useState<string[]>([]);

  const limit = 10;

  useEffect(() => {
    fetchEmployees();
  }, [search, division, status, page]);

  useEffect(() => {
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get<any[]>(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/divisions`,
        config
      );
      const divisionNames = response.data.map((d) => d.division).filter(Boolean);
      setDivisions(divisionNames);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (division) params.append('division', division);
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await axios.get<ListResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/api/employees?${params}`,
        config
      );

      setEmployees(response.data?.data || []);
      setTotalPages(Math.ceil((response.data?.total || 0) / limit));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/employees/${id}`, config);

      toast.success('Employee deleted successfully');
      setDeleteConfirm(null);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  return (
    <ProtectedRoute requiredRole="Admin">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employees</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your employees</p>
            </div>
            <Link
              href="/dashboard/employees/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
            >
              <Plus size={20} />
              Add Employee
            </Link>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Division Filter */}
              <select
                value={division}
                onChange={(e) => {
                  setDivision(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Divisions</option>
                {divisions.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Resigned">Resigned</option>
              </select>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSearch('');
                  setDivision('');
                  setStatus('');
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading employees...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">No employees found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Code
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Name
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Email
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Division
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Position
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Status
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                          {emp.employee_code}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                          {emp.full_name}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                          {emp.email}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                          {emp.division}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                          {emp.position}
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              emp.employment_status === 'Active'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : emp.employment_status === 'Inactive'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {emp.employment_status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/employees/${emp.id}`}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                              title="View"
                            >
                              <Eye size={16} />
                            </Link>
                            <Link
                              href={`/dashboard/employees/${emp.id}/edit`}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </Link>
                            <button
                              onClick={() => setDeleteConfirm(emp.id)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Confirm Delete
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this employee? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
