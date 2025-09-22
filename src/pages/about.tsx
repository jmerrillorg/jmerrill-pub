import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />

      <main className="flex-grow px-6 py-20 max-w-4xl mx-auto text-center">
        <motion.h1
          className="text-4xl font-bold mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          About J Merrill Publishing, Inc.
        </motion.h1>

        <motion.p
          className="text-lg mb-10 text-gray-700 dark:text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Founded by Jackie Smith, Jr., J Merrill Publishing is a full-service, author-first company built on the principles of empowerment, transparency, and innovation. Our mission is to help authors help themselves — whether you&rsquo;re launching your first book or expanding your publishing empire.
        </motion.p>

        <div className="grid gap-8 md:grid-cols-2 text-left mb-16">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-[#1E90FF]">Our Mission</h3>
            <p>
              To empower authors through collaborative and transparent publishing, while upholding editorial excellence and amplifying diverse voices.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2 text-[#1E90FF]">Our Vision</h3>
            <p>
              To be the leading choice for authors seeking a true partnership in publishing, setting new standards for editorial integrity, inclusivity, and author empowerment.
            </p>
          </div>
        </div>

        <div className="text-left text-gray-700 dark:text-gray-300 space-y-6">
          <p>
            As the flagship business under <strong>J Merrill One</strong>, we lead with innovation, offering services like Blockchain Publishing and Audiobook Production, while maintaining the human-first values that define our work.
          </p>
          <p>
            In collaboration with <strong>J Merrill Foundation, Inc.</strong>, our commitment extends beyond publishing—we&rsquo;re deeply invested in community upliftment, literacy advancement, and providing platforms for underserved voices.
          </p>
          <p>
            From local outreach to global impact, our work is as much about purpose as it is about publishing.
          </p>
          <p className="font-semibold">
            We&rsquo;re more than a publisher — we&rsquo;re a partner in your legacy.
          </p>
        </div>

        <div className="mt-12 text-left">
          <h3 className="text-xl font-semibold mb-4 text-[#1E90FF]">Why Choose Us</h3>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
            <li>Full transparency at every stage</li>
            <li>70% royalties retained by authors</li>
            <li>Industry-leading partnerships (Ingram, Amazon, Apple & more)</li>
            <li>Blockchain and audiobook innovations</li>
            <li>Support for authors of all backgrounds and genres</li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}