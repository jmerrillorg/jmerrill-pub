'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function Navbar() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 shadow-sm">
      <Link href="/">
        <Image
          src="/logo.jpg"
          alt="J Merrill Logo"
          width={120}
          height={30}
          className="object-contain md:w-[120px] md:h-[30px]"
          priority
        />
      </Link>
      <div className="flex items-center space-x-6 text-sm font-medium text-gray-700 dark:text-gray-200">
        <Link href="#booking" className="hover:text-[#1E90FF] transition">Book</Link>
        <Link href="#services" className="hover:text-[#1E90FF] transition">Services</Link>
        <Link href="#about" className="hover:text-[#1E90FF] transition">About</Link>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="focus:outline-none"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </nav>
  );
}
