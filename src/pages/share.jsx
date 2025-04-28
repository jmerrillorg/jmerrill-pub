import React, { useState } from "react";
import Head from "next/head";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function ShareStory() {
  const [formData, setFormData] = useState({
    name: "",
    bookTitle: "",
    testimonial: "",
    photo: null,
    photoName: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file") {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        setFormData((prev) => ({
          ...prev,
          photo: base64,
          photoName: file.name
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/share-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setSubmitted(true);
        setFormData({
          name: "",
          bookTitle: "",
          testimonial: "",
          photo: null,
          photoName: ""
        });
      } else {
        alert("❌ Submission failed.");
      }
    } catch (err) {
      console.error("❌ Error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Share Your Story | J Merrill Publishing</title>
      </Head>

      <div className="flex flex-col min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
        <Navbar />

        <main className="flex-grow px-6 py-16 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-center">Share Your Story</h1>
          <p className="text-center text-lg mb-10">
            We'd love to hear how your publishing experience went and how your book has impacted others.
          </p>

          {submitted ? (
            <div className="bg-green-100 text-green-800 p-6 rounded shadow text-center">
              Thank you for sharing your story! 💬
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-medium mb-1">Your Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Book Title</label>
                <input
                  type="text"
                  name="bookTitle"
                  required
                  value={formData.bookTitle}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Testimonial</label>
                <textarea
                  name="testimonial"
                  required
                  value={formData.testimonial}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Upload a Photo (Optional)</label>
                <div className="relative">
                  <label className="bg-gray-100 border border-gray-300 px-4 py-2 rounded cursor-pointer hover:bg-gray-200 inline-block text-sm">
                    Choose File
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      onChange={handleChange}
                      className="hidden"
                    />
                  </label>
                  {formData.photoName && (
                    <p className="text-sm mt-1 text-gray-600">
                      📸 Selected: {formData.photoName}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#1E90FF] text-white px-6 py-2 rounded-full"
              >
                {submitting ? "Submitting..." : "Submit Story"}
              </button>
            </form>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}