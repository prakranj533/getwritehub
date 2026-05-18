import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WriteHub - Collaborative Book Writing",
  description: "Write, collaborate, and publish books together",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-grow bg-gray-50">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600">WriteHub</span>
                <span className="text-gray-400 text-sm">© {new Date().getFullYear()}</span>
              </div>
              <div className="flex gap-6 text-sm text-gray-500">
                <a href="#" className="hover:text-indigo-600 transition">About</a>
                <a href="#" className="hover:text-indigo-600 transition">Privacy</a>
                <a href="#" className="hover:text-indigo-600 transition">Terms</a>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
