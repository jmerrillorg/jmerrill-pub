// pages/books.jsx
import React from "react";
import Head from "next/head";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Books() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <Head>
        <title>Our Books | J Merrill Publishing</title>
        <meta
          name="description"
          content="Explore powerful books published by J Merrill Publishing, Inc."
        />
      </Head>

      <Navbar />

      <main className="flex-grow py-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-4xl font-bold mb-4">Our Books</h1>
          <p className="text-lg mb-8 text-gray-600 dark:text-gray-300">
            Discover inspiring titles from our authors. Support independent bookstores by shopping our curated catalog.
          </p>

          <a
            href="https://bookshop.org/shop/jmerrillpub"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition"
          >
            Browse Our Bookshop Store
          </a>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}