// components/ServiceDetailLayout.tsx
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface ServiceDetailLayoutProps {
  title: string;
  tagline?: string;
  description: string;
  features?: string[];
  ctaText: string;
  ctaLink: string;
}

const ServiceDetailLayout: React.FC<ServiceDetailLayoutProps> = ({
  title,
  tagline,
  description,
  features = [],
  ctaText,
  ctaLink
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-6 py-16"
    >
      {/* Breadcrumbs */}
      <nav className="text-sm mb-6 text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:underline">Home</Link> / {" "}
        <Link href="/services" className="hover:underline">Services</Link> / {" "}
        <span className="text-gray-700 dark:text-gray-300">{title}</span>
      </nav>

      <h1 className="text-4xl font-bold mb-2 text-center">{title}</h1>
      {tagline && <p className="text-lg mb-6 text-center text-blue-600 font-medium">{tagline}</p>}

      <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg text-center">
        {description}
      </p>

      {features.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-2 text-center">Key Features</h3>
          <ul className="list-disc list-inside text-left max-w-xl mx-auto text-gray-600 dark:text-gray-300">
            {features.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-center mt-10">
        <Link
          href={ctaLink}
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
        >
          {ctaText}
        </Link>
      </div>
    </motion.div>
  );
};

export default ServiceDetailLayout;