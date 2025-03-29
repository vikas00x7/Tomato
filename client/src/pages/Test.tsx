import React from 'react';

const TestPage = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Test Page</h1>
      <p>This is a test page to verify that the Vite server is working correctly.</p>
      
      <div className="mt-4">
        <h2 className="text-xl font-bold">API Test</h2>
        <button 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2"
          onClick={async () => {
            try {
              const response = await fetch('/api/test');
              const data = await response.json();
              alert(JSON.stringify(data, null, 2));
            } catch (error) {
              alert('Error: ' + error);
            }
          }}
        >
          Test API
        </button>
      </div>
      
      <div className="mt-4">
        <h2 className="text-xl font-bold">API Logs Test</h2>
        <button 
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
          onClick={async () => {
            try {
              const response = await fetch('/api/logs?key=tomato-api-key-9c8b7a6d5e4f3g2h1i');
              const data = await response.json();
              alert(JSON.stringify(data, null, 2));
            } catch (error) {
              alert('Error: ' + error);
            }
          }}
        >
          Test Logs API
        </button>
      </div>
    </div>
  );
};

export default TestPage;
