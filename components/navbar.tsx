"use client";

import { useAuth } from "@/components/auth-provider";
import { logOut } from "@/lib/firebase-auth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, LogOut, Plus, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await logOut();
    router.push("/auth/signin");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 brand-gradient rounded-md flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-[15px] tracking-tight">
              WriteHub
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <>
                <Link
                  href="/books/new"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Project
                </Link>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt="Profile"
                          width={28}
                          height={28}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full brand-gradient flex items-center justify-center text-white text-xs font-semibold">
                          {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                        {user.name || user.email?.split("@")[0]}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[200px] bg-white rounded-xl shadow-lg border border-gray-200 py-1 mt-1 animate-in fade-in zoom-in-95 z-50"
                      align="end"
                      sideOffset={4}
                    >
                      <div className="px-3 py-2 border-b border-gray-100 mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name || user.email?.split("@")[0]}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <DropdownMenu.Item
                        onSelect={handleSignOut}
                        className="flex items-center gap-2 mx-1 px-2 py-1.5 text-sm text-red-600 rounded-lg outline-none hover:bg-red-50 focus:bg-red-50 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
