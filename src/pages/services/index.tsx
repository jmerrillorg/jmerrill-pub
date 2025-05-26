// pages/services/index.tsx
import React from "react";
import Head from "next/head";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { motion } from "framer-motion";
import Link from "next/link";

const services = [
  {
    title: "Full-Service Publishing",
    description:
      "From manuscript to marketplace, we handle editing, layout, ISBN registration, and distribution. Perfect for authors seeking a guided, professional publishing experience.",
    link: "/services/full-service"
  },
  {
    title: "Blockchain Digital Publishing",
    description:
      "Future-proof your work. We tokenize your book on the blockchain for proof of ownership, royalty tracking, and digital monetization.",
    link: "/services/blockchain"
  },
  {
    title: "Audiobook Production",
    description:
      "Bring your book to life with professional voice talent, studio-quality editing, and distribution across major audio platforms.",
    link: "/services/audiobook"
  },
  {
    title: "Branding & Design",
    description:
      "Author websites, social graphics, and print materials designed to match your voice and vision. Stand out in a crowded market.",
    link: "/services/branding"
  },
  {
    title: "Legacy Writing Services",
    description:
      "Preserve your story. We help families, professionals, and visionaries capture their life experiences in published form.",
    link: "/services/legacy"
  },
  {
    title: "Marketing & Promotion",
    description:
      "Custom campaigns to launch your book with visibility. Includes social strategy, influencer outreach, and retail placements.",
    link: "/services/marketing"
  }
];

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <Head>
        <title>Publishing Services | J Merrill Publishing</title>
        <meta
          name="description"
          content="Explore J Merrill Publishing’s premium publishing services, including editing, design, distribution, and blockchain publishing."
        />
      </Head>

      <Navbar />

      <main className="flex-grow px-6 py-12 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-4 text-center">Our Publishing Services</h1>
          <p className="text-lg mb-12 text-center text-gray-600 dark:text-gray-300">
            Every story deserves expert support. Explore our core publishing services below.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm bg-white dark:bg-gray-800 flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-2">{service.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {service.description}
                  </p>
                </div>
                <Link
                  href={service.link}
                  className="inline-block mt-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
                >
                  Learn More
                </Link>
              </div>
            ))}
          </div>

          {/* Join the Family CTA */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold mb-2">Ready to Publish?</h3>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              Join the J Merrill Publishing family and bring your vision to life.
            </p>
            <Link
              href="/join"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              Join the Family
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}