import { Location } from "@/lib/types";

interface MapProps {
  location: Location;
}

const Map = ({ location }: MapProps) => {
  return (
    <div className="h-64 bg-gray-200 relative">
      <iframe 
        src={location.mapUrl} 
        width="100%" 
        height="100%" 
        style={{ border: 0 }} 
        allowFullScreen={false} 
        loading="lazy" 
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map of ${location.name}`}
        aria-label={`Map showing the location of Tomato restaurant at ${location.address}, ${location.city}`}
      ></iframe>
    </div>
  );
};

export default Map;
