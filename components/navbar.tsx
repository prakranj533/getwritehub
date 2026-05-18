"use client";

import { useAuth } from "@/components/auth-provider";
import { logOut } from "@/lib/firebase-auth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Book, User, LogOut, Plus, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await logOut();
    router.push("/auth/signin");
  };

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform duration-300">
              <Book className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-gray-900 group-hover:text-indigo-600 transition-colors">
              WriteHub
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-6">
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <>
                <Link
                  href="/books/new"
                  className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all duration-300 shadow-lg shadow-indigo-100"
                >
                  <Plus className="w-5 h-5" />
                  New Project
                </Link>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900 leading-none mb-1">
                      {user.name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                      Author
                    </p>
                  </div>

                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="flex items-center gap-2 p-1 rounded-2xl hover:bg-gray-50 transition-all duration-300 focus:outline-none border border-transparent hover:border-gray-100">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt="Profile"
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl premium-gradient flex items-center justify-center text-white font-bold shadow-sm">
                            {user.name?.[0] || user.email?.[0] || "U"}
                          </div>
                        )}
                        <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="min-w-[220px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 z-50 mr-4 mt-3"
                        align="end"
                      >
                        <DropdownMenu.Label className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                          Account Settings
                        </DropdownMenu.Label>
                        <DropdownMenu.Item
                          onSelect={handleSignOut}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 rounded-xl outline-none hover:bg-red-50 focus:bg-red-50 cursor-pointer transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/signin"
                  className="px-6 py-2.5 text-gray-600 hover:text-indigo-600 font-bold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all duration-300 shadow-xl"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
