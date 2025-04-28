// src/pages/appointments.jsx
import BookingsEmbed from "@/components/BookingsEmbed";

export default function AppointmentsPage() {
  return (
    <div className="px-4 py-12 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Book a Publishing Consultation</h1>
      <p className="text-lg text-gray-700 mb-6">
        Use the scheduler below to book time with our publishing team.
      </p>
      <BookingsEmbed />
    </div>
  );
}
