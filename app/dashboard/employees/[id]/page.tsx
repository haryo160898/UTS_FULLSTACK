'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { ArrowLeft, Edit } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  gender: string;
  birth_date: string;
  email: string;
  phone_number: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  division: string;
  position: string;
  salary: number;
  join_date: string;
  employment_status: string;
  profile_photo?: string;
  emergency_contact: string;
  emergency_phone: string;
  education: string;
  marital_status: string;
  created_at: string;
  updated_at: string;
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const id = params.id as string;

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/employees/${id}`,
          config
        );

        setEmployee(response.data);
      } catch (error) {
        console.error('Error fetching employee:', error);
        toast.error('Failed to load employee');
        router.push('/dashboard/employees');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployee();
  }, [id, router]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!employee) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Employee not found</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="Admin">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/employees"
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {employee.full_name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{employee.position}</p>
              </div>
            </div>
            <Link
              href={`/dashboard/employees/${employee.id}/edit`}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
            >
              <Edit size={20} />
              Edit
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              {employee.profile_photo ? (
                <img
                  src={employee.profile_photo}
                  alt={employee.full_name}
                  className="w-full aspect-square rounded-xl object-cover mb-4"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-gray-400 text-center">No Photo</span>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Employee Code</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {employee.employee_code}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                    employee.employment_status === 'Active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : employee.employment_status === 'Inactive'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  {employee.employment_status}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.full_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Gender</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.gender}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Birth Date</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.birth_date
                        ? new Date(employee.birth_date).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone Number</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.phone_number || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Marital Status</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.marital_status}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.address || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Employment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Division</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.division}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.position}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Salary</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.salary
                        ? new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                          }).format(employee.salary)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Join Date</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {new Date(employee.join_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Contact Name</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.emergency_contact || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Contact Phone</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                      {employee.emergency_phone || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
