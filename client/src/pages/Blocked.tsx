import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface BlockedProps {
  reason?: string;
}

/**
 * Blocked page shown to unauthorized bots
 */
const Blocked = ({ reason = "Unauthorized access is not permitted" }: BlockedProps) => {
  const [_, navigate] = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-6 md:p-8 bg-white shadow-lg">
        <div className="text-center mb-6">
          <div className="mb-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-16 h-16 mx-auto text-red-500"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Blocked</h1>
          <p className="text-lg text-gray-600">
            {reason}
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-medium text-gray-900 mb-2">Why has access been blocked?</h2>
          <p className="text-gray-600 mb-3">
            Our system has identified your traffic as unauthorized automated access. This could be due to:
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>Use of automated scraping tools</li>
            <li>Unusual access patterns</li>
            <li>Missing standard browser features</li>
            <li>Violating our terms of service</li>
          </ul>
        </div>
        
        <div className="text-center">
          <Button 
            onClick={() => navigate('/paywall')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Request Access
          </Button>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>If you believe this is an error, please contact our support team.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Blocked;
