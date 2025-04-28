import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function BookingsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow px-4 py-16 text-gray-900 dark:text-gray-100 text-center">
        <h1 className="text-3xl font-bold mb-4">Book a Consultation</h1>
        <p className="max-w-2xl mx-auto mb-8 text-gray-600 dark:text-gray-300">
          Schedule your personalized consultation directly below.
        </p>

        <div className="max-w-full px-4 mx-auto">
          <iframe
            src="https://outlook.office.com/book/JMerrillPublishingInc@jmerrill.pub/"
            width="100%"
            height="800"
            frameBorder="0"
            scrolling="yes"
            title="Book Consultation"
            className="rounded-md shadow-md"
          ></iframe>
        </div>
      </main>

      <Footer />
    </div>
  );
}
