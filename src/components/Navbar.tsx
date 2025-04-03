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
        <Link href="/bookings" className="hover:text-[#1E90FF] transition">Book</Link>

        {/* Services Dropdown */}
        <div className="relative group">
          <button className="hover:text-[#1E90FF] transition">Services</button>
          <div className="absolute hidden group-hover:block bg-white border shadow-lg mt-2 rounded-lg p-2 w-56 space-y-1 text-sm text-gray-800 z-50">
            <Link href="/services/full-service" className="block hover:text-[#1E90FF] transition">Full-Service Publishing</Link>
            <Link href="/services/blockchain" className="block hover:text-[#1E90FF] transition">Blockchain Publishing</Link>
            <Link href="/services/audiobook" className="block hover:text-[#1E90FF] transition">Audiobook Production</Link>
            <Link href="/services/branding" className="block hover:text-[#1E90FF] transition">Branding</Link>
            <Link href="/services/legacy" className="block hover:text-[#1E90FF] transition">Legacy</Link>
            <Link href="/services/marketing" className="block hover:text-[#1E90FF] transition">Marketing & Promotion</Link>
          </div>
        </div>

        <Link href="/about" className="hover:text-[#1E90FF] transition">About</Link>
        <Link href="/join" className="hover:text-[#1E90FF] transition">Join the Family</Link>
      </div>
    </nav>
  );
}