import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Rocket, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return ( 
    <main>
      <Navbar />
      {/* Existing hero + rest of homepage */}
    </main>
  );
}
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
    <Link href="#booking" className="hover:text-[#1E90FF] transition">Book</Link>
    <Link href="#services" className="hover:text-[#1E90FF] transition">Services</Link>
    <Link href="#about" className="hover:text-[#1E90FF] transition">About</Link>
  </div>
</nav>
export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#006fd6] to-[#1E90FF] text-white py-24 px-4 text-center">
        <motion.h1
          className="text-5xl font-bold mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          J Merrill Publishing, Inc.
        </motion.h1>
        <motion.p
          className="text-xl mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Helping Authors Help Themselves — through innovation, integrity, and a
          collaborative publishing model.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <a href="#booking" className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition">
            Book a Consultation
          </a>
        </motion.div>
      </section>

      {/* Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-16 bg-gray-100">
        <Card>
          <CardContent className="p-6 text-center">
            <Rocket className="w-12 h-12 mx-auto mb-4 text-[#1E90FF]" />
            <h2 className="text-xl font-semibold mb-2">Blockchain Publishing</h2>
            <p>
              Leading the industry with transparent, tech-forward author royalties.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-[#1E90FF]" />
            <h2 className="text-xl font-semibold mb-2">Full-Service Publishing</h2>
            <p>
              From manuscript to marketing—our authors retain 70% royalties across
              all formats.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-[#1E90FF]" />
            <h2 className="text-xl font-semibold mb-2">Author Empowerment</h2>
            <p>We don’t just publish books—we build author legacies.</p>
          </CardContent>
        </Card>
      </section>
      <section id="booking" className="my-12 px-4 scroll-mt-20">
  <h2 className="text-2xl font-semibold text-center mb-4">Schedule a Consultation</h2>
  <div className="w-full h-[750px]">
    <iframe
      src="https://outlook.office.com/book/JMerrillPublishingInc@jmerrill.pub/"
      className="w-full h-full border-none rounded-xl shadow-xl"
      title="Book a Consultation"
    />
  </div>
</section>
    </main>
  );
}