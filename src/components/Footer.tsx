import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <motion.footer
      className="border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-10 mt-16"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
        {/* Company Info */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">J Merrill Publishing, Inc.</h3>
          <p className="text-sm">
            Helping Authors Help Themselves — through innovation, integrity, and editorial excellence.
          </p>
        </div>

        {/* Quick Links */}
        <div className="text-sm space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Quick Links</h4>
          <div className="space-y-1 flex flex-col items-center md:items-start">
            <Link href="/books" className="hover:underline">Our Books</Link>
            <Link href="/services" className="hover:underline">Services</Link>
            <Link href="/pricing" className="hover:underline">Pricing</Link>
            <Link href="/about" className="hover:underline">About</Link>
            <Link href="/join" className="hover:underline">Join the Family</Link>
          </div>
        </div>

        {/* Social Media */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Follow Us</h4>
          <div className="flex justify-center md:justify-start gap-4">
            <a href="https://www.facebook.com/jmerrillpub" target="_blank" rel="noopener noreferrer" className="hover:text-[#1E90FF]">Facebook</a>
            <a href="https://www.instagram.com/jmerrillpub/" target="_blank" rel="noopener noreferrer" className="hover:text-[#1E90FF]">Instagram</a>
            <a href="https://www.linkedin.com/company/jmerrillpub/" target="_blank" rel="noopener noreferrer" className="hover:text-[#1E90FF]">LinkedIn</a>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} J Merrill Publishing, Inc. All rights reserved.
      </div>
    </motion.footer>
  );
}