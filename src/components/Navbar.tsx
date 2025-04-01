import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm">
      <Link href="/">
        <Image
          src="/logo.jpg"
          alt="J Merrill Logo"
          width={160}
          height={40}
          className="object-contain"
          priority
        />
      </Link>
      <div className="space-x-6 hidden md:flex text-sm font-medium text-gray-700">
        <Link href="#booking" className="hover:text-[#1E90FF] transition">
          Book
        </Link>
        <Link href="#services" className="hover:text-[#1E90FF] transition">
          Services
        </Link>
        <Link href="#about" className="hover:text-[#1E90FF] transition">
          About
        </Link>
      </div>
    </nav>
  );
}