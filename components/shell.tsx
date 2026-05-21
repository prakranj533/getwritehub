"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BookOpen } from "lucide-react";

const AUTH_PATHS = ["/auth/signin", "/auth/signup"];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow bg-gray-50">{children}</main>
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">WriteHub</span>
              <span className="text-sm text-gray-400">© {new Date().getFullYear()}</span>
            </div>
            <nav className="flex gap-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">About</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Terms</a>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
