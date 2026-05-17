'use client';

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { Upload, File, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface UploadResult {
  message: string;
  fileName: string;
  insertedCount: number;
  totalRows: number;
  failedCount?: number;
  errors?: string[];
}

export default function UploadDataPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileExt = file.name.toLowerCase().split('.').pop();

    if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
      toast.error('Please upload an Excel or CSV file');
      return;
    }

    setIsUploading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload/file`,
        formData,
        {
          ...config,
          headers: { ...config.headers, 'Content-Type': 'multipart/form-data' },
        }
      );

      setUploadResults([response.data, ...uploadResults]);
      
      // Show appropriate toast based on results
      if (response.data.failedCount && response.data.failedCount > 0) {
        toast.success(
          `Upload completed! ${response.data.insertedCount} added, ${response.data.failedCount} failed`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `Successfully uploaded! ${response.data.insertedCount} employees added.`,
          { duration: 4000 }
        );
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="Admin">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload Data</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Import employee data from Excel or CSV files
            </p>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex flex-col items-center">
              <Upload
                size={48}
                className={`mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`}
              />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Drag and drop your file here
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                or click the button below to select
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Select File'}
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Supported formats: .xlsx, .xls, .csv
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Upload Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
              File Format Requirements
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <li>• The file should have headers matching the database columns</li>
              <li>
                • <strong>Required columns:</strong> employee_code, full_name, email
              </li>
              <li>
                • <strong>Optional columns:</strong> gender, birth_date, phone_number, address, city, province, postal_code, division, position, salary, join_date, employment_status, emergency_contact, emergency_phone, education, marital_status
              </li>
              <li>• Duplicate employee codes will update existing records</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Supported formats: .xlsx, .xls, .csv</li>
            </ul>
          </div>

          {/* Upload Results */}
          {uploadResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upload History
              </h3>
              {uploadResults.map((result, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <CheckCircle className={`w-6 h-6 ${result.failedCount && result.failedCount > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <File size={18} className="text-gray-400" />
                        <p className="font-medium text-gray-900 dark:text-white">
                          {result.fileName}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {result.message}
                      </p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            result.failedCount && result.failedCount > 0 ? 'bg-yellow-600' : 'bg-green-600'
                          }`}
                          style={{
                            width: `${Math.round(
                              (result.insertedCount / result.totalRows) * 100
                            )}%`,
                          }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <p className="text-green-600 dark:text-green-400 font-semibold">
                            {result.insertedCount}
                          </p>
                          <p className="text-green-700 dark:text-green-300 text-xs">
                            Success
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-gray-600 dark:text-gray-400 font-semibold">
                            {result.totalRows}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300 text-xs">
                            Total
                          </p>
                        </div>
                        {result.failedCount && result.failedCount > 0 && (
                          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                            <p className="text-red-600 dark:text-red-400 font-semibold">
                              {result.failedCount}
                            </p>
                            <p className="text-red-700 dark:text-red-300 text-xs">
                              Failed
                            </p>
                          </div>
                        )}
                      </div>

                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                            Errors:
                          </p>
                          <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                            {result.errors.slice(0, 5).map((error, errIndex) => (
                              <li key={errIndex}>• {error}</li>
                            ))}
                            {result.errors.length > 5 && (
                              <li className="text-red-600 dark:text-red-300 pt-1">
                                ... and {result.errors.length - 5} more errors
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
