import { useState } from "react";
import { Helmet } from "react-helmet";
import ContactForm from "../components/contact/ContactForm";
import Map from "../components/contact/Map";
import FaqSection from "../components/contact/FaqSection";
import locations from "../data/locations.json";

const Contact = () => {
  const [activeLocation, setActiveLocation] = useState(locations[0]);
  
  return (
    <>
      <Helmet>
        <title>Contact Us | Tomato Restaurant</title>
        <meta name="description" content="Get in touch with Tomato restaurant. Find our locations, hours, and contact information or send us a message." />
      </Helmet>

      <main className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">Contact Us</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We'd love to hear from you! Send us a message, visit one of our locations, or connect with us on social media.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8">Send Us a Message</h2>
              <ContactForm />
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8">Visit One of Our Locations</h2>
              
              {/* Location Tabs */}
              <div className="mb-6 overflow-x-auto">
                <div className="flex space-x-2 min-w-max">
                  {locations.map(location => (
                    <button
                      key={location.id}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                        activeLocation.id === location.id 
                          ? 'bg-tomato-500 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setActiveLocation(location)}
                    >
                      {location.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-lg overflow-hidden shadow-md">
                <Map location={activeLocation} />
                <div className="p-6">
                  <h3 className="text-xl font-serif font-bold mb-2">{activeLocation.name}</h3>
                  <address className="text-gray-600 mb-4 not-italic">
                    {activeLocation.address}<br />
                    {activeLocation.city}, {activeLocation.state} {activeLocation.zip}
                  </address>
                  <div className="mb-4">
                    <div className="flex items-center mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-tomato-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-2">{activeLocation.weekdayHours}</span>
                    </div>
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-tomato-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-2">{activeLocation.weekendHours}</span>
                    </div>
                  </div>
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-tomato-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span className="ml-2 text-gray-600">(415) 555-0123</span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-tomato-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span className="ml-2 text-gray-600">info@tomatofood.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <FaqSection />
        </div>
      </main>
    </>
  );
};

export default Contact;
