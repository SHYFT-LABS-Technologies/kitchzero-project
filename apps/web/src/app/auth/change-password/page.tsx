'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Key, Check, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { setMustChangePassword, isAuthenticated } = useAuthStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  const newPassword = watch('newPassword');

  // Password validation rules
  const passwordValidation = {
    minLength: newPassword?.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword || ''),
    hasLowercase: /[a-z]/.test(newPassword || ''),
    hasNumber: /\d/.test(newPassword || ''),
    hasSpecial: /[@$!%*?&]/.test(newPassword || ''),
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const onSubmit = async (data: ChangePasswordForm) => {
    if (!isAuthenticated) {
      toast.error('Please log in first');
      router.push('/auth/login');
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (response.success) {
        setMustChangePassword(false);
        toast.success('Password changed successfully!');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Change Password</h2>
        <p className="mt-2 text-sm text-gray-600">
          For security reasons, you must change your password before continuing
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
            Current Password
          </label>
          <div className="mt-1 relative">
            <input
              {...register('currentPassword', {
                required: 'Current password is required',
              })}
              type={showCurrentPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="input pr-10"
              placeholder="Enter your current password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-2 text-sm text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="mt-1 relative">
            <input
              {...register('newPassword', {
                required: 'New password is required',
                validate: () => isPasswordValid || 'Password does not meet requirements',
              })}
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input pr-10"
              placeholder="Enter your new password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          
          {/* Password requirements */}
          {newPassword && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Password requirements:</p>
              <ul className="space-y-1">
                {[
                  { key: 'minLength', text: 'At least 8 characters' },
                  { key: 'hasUppercase', text: 'One uppercase letter' },
                  { key: 'hasLowercase', text: 'One lowercase letter' },
                  { key: 'hasNumber', text: 'One number' },
                  { key: 'hasSpecial', text: 'One special character (@$!%*?&)' },
                ].map(({ key, text }) => (
                  <li key={key} className="flex items-center text-sm">
                    {passwordValidation[key as keyof typeof passwordValidation] ? (
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <X className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span
                      className={
                        passwordValidation[key as keyof typeof passwordValidation]
                          ? 'text-green-700'
                          : 'text-red-700'
                      }
                    >
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {errors.newPassword && (
            <p className="mt-2 text-sm text-red-600">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <div className="mt-1 relative">
            <input
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === newPassword || 'Passwords do not match',
              })}
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input pr-10"
              placeholder="Confirm your new password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading || !isPasswordValid}
            className="btn-primary w-full flex items-center justify-center disabled:opacity-50"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}