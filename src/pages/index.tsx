import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Rocket, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow text-gray-900 dark:text-gray-100">
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
            <a href="#" className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition">
              Book a Consultation
            </a>
          </motion.div>
        </section>

        {/* About Section */}
        <section id="about" className="px-4 py-16 bg-white dark:bg-gray-900 text-center scroll-mt-20">
          <h2 className="text-3xl font-bold mb-4">About Us</h2>
          <p className="max-w-2xl mx-auto text-gray-700 dark:text-gray-300">
            J Merrill Publishing, Inc. was built for authors who value transparency, empowerment, and creative control.
            We're redefining publishing with bold tech, diverse voices, and human-first partnerships.
          </p>
        </section>

        {/* Services Section */}
        <section id="services" className="scroll-mt-20 py-16 px-4 bg-gray-100 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Our Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <Card>
                <CardContent className="p-6">
                  <Rocket className="w-12 h-12 mx-auto mb-4 text-[#1E90FF]" />
                  <h3 className="text-xl font-semibold mb-2">Blockchain Publishing</h3>
                  <p>Leading the industry with transparent, tech-forward author royalties.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-[#1E90FF]" />
                  <h3 className="text-xl font-semibold mb-2">Full-Service Publishing</h3>
                  <p>From manuscript to marketing—our authors retain 70% royalties across all formats.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Users className="w-12 h-12 mx-auto mb-4 text-[#1E90FF]" />
                  <h3 className="text-xl font-semibold mb-2">Author Empowerment</h3>
                  <p>We don’t just publish books—we build author legacies.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}