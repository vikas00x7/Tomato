import { Link } from "wouter";
import { useEffect, useState } from "react";
import locations from "../../data/locations.json";

// Define Location interface
interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  weekdayHours: string;
  weekendHours: string;
  mapUrl: string;
}

const LocationsSection = () => {
  const [locationsList, setLocationsList] = useState<Location[]>([]);
  
  useEffect(() => {
    setLocationsList(locations);
  }, []);
  
  return (
    <section id="locations" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-tomato-500 font-medium">LOCATIONS</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mt-2 mb-4">Find a Tomato Near You</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            With multiple locations across the Bay Area, there's always a Tomato nearby.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {locationsList.map((location: Location) => (
            <div key={location.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-md">
              <div className="h-48 bg-gray-200 relative">
                <iframe 
                  src={location.mapUrl} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={false} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${location.name}`}
                ></iframe>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-serif font-bold mb-2">{location.name}</h3>
                <address className="text-gray-600 mb-4 not-italic">
                  {location.address}<br />
                  {location.city}, {location.state} {location.zip}
                </address>
                <div className="mb-4">
                  <div className="flex items-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-tomato-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2">{location.weekdayHours}</span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-tomato-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2">{location.weekendHours}</span>
                  </div>
                </div>
                <a 
                  href={`https://maps.google.com/?q=${location.address},${location.city},${location.state},${location.zip}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-tomato-500 font-medium hover:text-tomato-700 transition-colors inline-flex items-center"
                >
                  Get Directions
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;
