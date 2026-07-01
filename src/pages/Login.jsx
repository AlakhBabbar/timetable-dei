import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Building2, Mail, Lock, LogIn, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, signUpTeacher, resetPassword, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setLocalError('');
    try {
      if (isSignUp) {
        await signUpTeacher(email, password);
        setSuccessMessage("Teacher account created successfully! Redirecting...");
        setTimeout(() => {
          navigate('/teacher-occupancy');
        }, 1500);
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err) {
      // Error is handled in the store
    }
  };

  const handleResetPassword = async () => {
    setSuccessMessage('');
    setLocalError('');
    if (!email) {
      setLocalError("Please enter your email address first to reset password.");
      return;
    }
    try {
      await resetPassword(email);
      setSuccessMessage("Password reset email sent. Please check your inbox and spam folder.");
    } catch (err) {
      // Error is handled in the store
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-full shadow-lg">
            <Building2 className="h-12 w-12 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Dayalbagh Educational Institute
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Timetable Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              className={`flex-1 text-center pb-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
                !isSignUp
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => {
                setIsSignUp(false);
                setSuccessMessage('');
                setLocalError('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 text-center pb-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
                isSignUp
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => {
                setIsSignUp(true);
                setSuccessMessage('');
                setLocalError('');
              }}
            >
              Teacher Sign Up
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {(error || localError) && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error || localError}</p>
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                  placeholder={isSignUp ? "teacher@dei.ac.in" : "admin@dei.ac.in"}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isSignUp ? "Signing up..." : "Signing in..."}
                  </span>
                ) : (
                  <span className="flex items-center">
                    {isSignUp ? (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Sign Up as Teacher
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 mr-2" />
                        Sign In
                      </>
                    )}
                  </span>
                )}
              </button>
            </div>

            {isSignUp && (
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setSuccessMessage('');
                    setLocalError('');
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Already have an account? Sign In
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
