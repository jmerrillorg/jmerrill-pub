import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Rocket, Users } from "lucide-react";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900 scroll-smooth">
      <Navbar />

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
          <a
            href="#booking"
            className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition"
          >
            Book a Consultation
          </a>
        </motion.div>
      </section>

      {/* Services Preview Section */}
      <section id="services" className="px-4 py-12 text-center bg-white scroll-mt-20">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Explore Our Services</h2>
        <p className="text-gray-600 mb-6 max-w-xl mx-auto">
          Whether you're looking to publish, market, or build your author brand—we're here for every step.
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <a href="#services" className="px-6 py-3 bg-[#1E90FF] text-white rounded-full hover:bg-blue-700 transition">
            View Services
          </a>
          <a href="#about" className="px-6 py-3 bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition">
            Learn More
          </a>
        </div>
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
              From manuscript to marketing—our authors retain 70% royalties across all formats.
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

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center md:hidden">
        <a
          href="#booking"
          className="bg-[#1E90FF] text-white px-6 py-3 rounded-full shadow-lg font-semibold transition hover:bg-blue-700"
        >
          Book a Consultation
        </a>
      </div>
    </main>
  );
}