import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm">
      <Link href="/">
        <Image
          src="/logo.jpg"
          alt="J Merrill Logo"
          width={100}
          height={15}
          className="object-contain"
          priority
        />
      </Link>

      <div className="space-x-6 hidden md:flex text-sm font-medium text-gray-700 items-center">
        <Link href="/books" className="hover:text-[#1E90FF] transition">Our Books</Link>
        <Link href="/schedule" className="hover:text-[#1E90FF] transition">Schedule</Link>
        <Link href="/services" className="hover:underline">Services</Link>
        <Link href="/about" className="hover:text-[#1E90FF] transition">About</Link>
        <Link href="/join" className="hover:text-[#1E90FF] transition">Join the Family</Link>
      </div>
    </nav>
  );
}