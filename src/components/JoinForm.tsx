import React, { useState, ChangeEvent, FormEvent } from "react";

type FormDataType = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bookTitle: string;
  genre: string;
  timezone: string;
  initialStatus: string;
  estimatedPubDate: string;
  message: string;
};

export default function JoinForm() {
  const [formData, setFormData] = useState<FormDataType>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bookTitle: "",
    genre: "",
    timezone: "",
    initialStatus: "New",
    estimatedPubDate: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const requiredFields: (keyof FormDataType)[] = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "bookTitle",
      "genre",
      "timezone",
      "estimatedPubDate",
      "message",
    ];

    const missingField = requiredFields.find((field) => !formData[field]);
    if (missingField) {
      alert(
        `Please complete the ${missingField
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()} field.`
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        "https://prod-48.westus.logic.azure.com:443/workflows/35415f54a3a54cfaa7143f0ebad289f0/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=KCetIWt6Lf4-sWme674ySAT_eh3i_tpWOyeQrWB1fKg",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (res.ok) setSubmitted(true);
      else alert("There was an error submitting the form.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-2">You&rsquo;re in!</h2>
        <p className="text-gray-700">
          We&rsquo;ve received your inquiry and will follow up soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">First Name</label>
          <input
            type="text"
            name="firstName"
            required
            className="w-full px-4 py-2 border rounded-md"
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block font-medium">Last Name</label>
          <input
            type="text"
            name="lastName"
            required
            className="w-full px-4 py-2 border rounded-md"
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Email</label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-4 py-2 border rounded-md"
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block font-medium">Phone</label>
          <input
            type="tel"
            name="phone"
            required
            className="w-full px-4 py-2 border rounded-md"
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label className="block font-medium">Book Title</label>
        <input
          type="text"
          name="bookTitle"
          required
          className="w-full px-4 py-2 border rounded-md"
          onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Genre</label>
          <select
            name="genre"
            required
            className="w-full px-4 py-2 border rounded-md"
            onChange={handleChange}
          >
            <option value="">Select a Genre</option>
            <option value="Fiction">Fiction</option>
            <option value="Nonfiction">Nonfiction</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Biography">Biography</option>
            <option value="Children">Children</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Timezone</label>
          <select
            name="timezone"
            required
            className="w-full px-4 py-2 border rounded-md"
            onChange={handleChange}
          >
            <option value="">Select Timezone</option>
            <option value="EST">EST (Eastern)</option>
            <option value="CST">CST (Central)</option>
            <option value="MST">MST (Mountain)</option>
            <option value="PST">PST (Pacific)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block font-medium">Estimated Publishing Date</label>
        <input
          type="date"
          name="estimatedPubDate"
          required
          className="w-full px-4 py-2 border rounded-md"
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block font-medium">Message</label>
        <textarea
          name="message"
          rows={4}
          required
          className="w-full px-4 py-2 border rounded-md"
          onChange={handleChange}
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-[#1E90FF] text-white px-6 py-2 rounded-full hover:bg-blue-700 transition"
      >
        {loading ? "Submitting..." : "Submit Inquiry"}
      </button>
    </form>
  );
}