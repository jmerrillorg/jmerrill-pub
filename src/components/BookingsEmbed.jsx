// src/components/BookingsEmbed.jsx
const BookingsEmbed = () => {
    return (
      <div className="w-full h-[1000px] rounded-2xl shadow-xl overflow-hidden mt-10">
        <iframe
          src="https://outlook.office.com/book/JMerrillPublishingInc@jmerrill.pub/"
          width="100%"
          height="1000"
          frameBorder="0"
          title="Schedule a Publishing Consultation"
        />
      </div>
    );
  };
  
  export default BookingsEmbed;