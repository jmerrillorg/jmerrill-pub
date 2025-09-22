// src/pages/appointments.tsx
import React from "react";
import MetaHead from "../components/MetaHead";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function AppointmentsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <MetaHead
        title="Schedule with J Merrill Publishing"
        description="Book your personalized consultation with J Merrill Publishing."
      />

      <Navbar />

      <main className="flex-grow px-4 pt-10 pb-6 text-gray-900 dark:text-gray-100 text-center">
        <div className="max-w-3xl mx-auto w-full">
          <h1 className="text-4xl font-bold mb-2 text-blue-700 dark:text-blue-400">
            Schedule with J Merrill Publishing
          </h1>
          <p className="text-md mb-8 text-gray-600 dark:text-gray-300">
            Choose your preferred time below to book your publishing consultation with our team.
          </p>

          {/* Book Now Button */}
          <a
            href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            Book Now
          </a>

          {/* Help text */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Need help with scheduling?{" "}
            <a href="/contact" className="text-blue-600 hover:underline">Contact us</a> 
            {" "}or call (614) 965-6057.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}