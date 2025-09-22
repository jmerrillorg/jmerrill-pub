import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";
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
            <div className="flex justify-center gap-4 mt-4">
              {/* Direct external link to Microsoft Bookings */}
              <a
                href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition"
              >
                Schedule a Consultation
              </a>
              <Link href="/join" legacyBehavior>
                <a className="bg-white text-[#1E90FF] px-6 py-2 rounded-full border border-white hover:bg-blue-100 hover:text-blue-700 transition">
                  Join the Family
                </a>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Services & About Section */}
        <section className="py-20 px-6 max-w-7xl mx-auto text-center">
          {/* SERVICES */}
          <h2 id="services" className="text-3xl font-bold mb-4">Our Publishing Services</h2>
          <p className="text-gray-600 mb-12">
            Explore our comprehensive offerings designed to support you through every step of your publishing journey.
          </p>
          <div className="grid gap-6 md:grid-cols-3 text-left">
            <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
              <h3 className="text-xl font-semibold mb-2">Full-Service Publishing</h3>
              <p className="text-gray-700 text-sm">
                From manuscript to marketplace, we manage editing, design, ISBN, distribution, and more.
              </p>
            </div>
            <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
              <h3 className="text-xl font-semibold mb-2">Audiobook Production</h3>
              <p className="text-gray-700 text-sm">
                Bring your book to life with professional narration, studio-quality sound, and global distribution.
              </p>
            </div>
            <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
              <h3 className="text-xl font-semibold mb-2">Blockchain Publishing</h3>
              <p className="text-gray-700 text-sm">
                Secure your intellectual property on the blockchain. Immutable records. Transparent royalties. Future-ready.
              </p>
            </div>
          </div>

          {/* ABOUT */}
          <div id="about" className="mt-24 text-left">
            <h2 className="text-3xl font-bold mb-4 text-center">About J Merrill Publishing</h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-center">
              J Merrill Publishing, Inc. is a full-service, author-focused publishing company committed to excellence, empowerment, and inclusivity.
              Founded by <strong>Jackie Smith, Jr.</strong>, our mission is simple: <em>Helping Authors Help Themselves</em>.
            </p>
            <p className="text-gray-600 max-w-3xl mx-auto text-center mt-6">
              We believe in transparency, high standards, and providing publishing solutions that evolve with technology — like our blockchain and audiobook innovations.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/join" legacyBehavior>
                <a className="bg-[#1E90FF] text-white px-6 py-2 rounded-full hover:bg-blue-700 transition">
                  Join the Family
                </a>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}