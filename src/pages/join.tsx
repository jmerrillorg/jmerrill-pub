// pages/join.tsx

import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JoinForm from "../components/JoinForm";

export default function JoinPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow">
        <section
          className="px-4 py-16 text-gray-900 dark:text-gray-100 text-center"
          aria-label="Join the Family Inquiry Form"
        >
          <h1 className="text-3xl font-bold mb-4">Join the Family</h1>
          <p className="max-w-2xl mx-auto mb-8 text-gray-600 dark:text-gray-300">
            Ready to publish? Complete the inquiry below to begin the onboarding process with J Merrill Publishing, Inc.
          </p>

          <div className="max-w-xl mx-auto">
            <JoinForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}