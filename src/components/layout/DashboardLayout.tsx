import React, { ReactNode } from 'react';
import Head from 'next/head';
import { useSession, signOut } from 'next-auth/react';
import { Users, Settings, LogOut, Home } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title = 'Dashboard' }: DashboardLayoutProps) {
  const { data: session } = useSession();

  return (
    <>
      <Head>
        <title>{title} - LegacyOS</title>
        <meta name="description" content="Your Family Office Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-purple-600">LegacyOS</span>
                </div>
                <div className="hidden md:ml-10 md:flex md:space-x-8">
                  <a href="/dashboard" className="text-gray-900 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium flex items-center">
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </a>
                  <a href="/family" className="text-gray-500 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Family
                  </a>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {session?.user?.name || session?.user?.email}
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-gray-500 hover:text-purple-600 p-2 rounded-md flex items-center"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </>
  );
} 