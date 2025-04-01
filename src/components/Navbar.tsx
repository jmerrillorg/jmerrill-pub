// src/components/Navbar.tsx
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
      <Link href="/">
        <Image
          src="/logo.jpg" // make sure the logo is in the public/ folder
          alt="J Merrill Publishing Logo"
          width={160}
          height={40}
          className="object-contain"
        />
      </Link>
      <div className="space-x-6 hidden md:flex text-sm font-medium text-gray-700">
        <Link href="#booking" className="hover:text-blue-600 transition">Book</Link>
        <Link href="#services" className="hover:text-blue-600 transition">Services</Link>
        <Link href="#about" className="hover:text-blue-600 transition">About</Link>
      </div>
    </nav>
  );
}