import { Helmet } from "react-helmet";
import team from "../data/team.json";
import TeamMember from "../components/about/TeamMember";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Us | Tomato Restaurant</title>
        <meta name="description" content="Learn about the Tomato story, our mission for fresh quality food, and the dedicated team that makes it all happen." />
      </Helmet>

      <main className="bg-white">
        {/* Hero Section */}
        <section className="relative h-80 md:h-96 flex items-center">
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <img
            src="https://images.unsplash.com/photo-1498579809087-ef1e558fd1da?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80"
            alt="Inside Tomato restaurant"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20 text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Our Story</h1>
            <p className="text-xl text-white max-w-2xl mx-auto">
              The journey from farm to table, told with passion and purpose.
            </p>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-tomato-500 font-medium">ABOUT TOMATO</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mt-2 mb-6">From Farm to Silicon Valley</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
              <div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Tomato began in 2018 with a simple idea: why can't fast-casual food be both convenient and truly good for you? Our founder, James Wilson, saw a gap in the Silicon Valley food scene—plenty of fine dining and plenty of fast food, but few options that combined speed, quality, and sustainability.
                </p>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  With a background in both technology and hospitality, James approached food service with the innovative mindset that Silicon Valley is known for. He assembled a team of culinary experts, sustainable farming advocates, and tech-savvy operations specialists to create a new kind of restaurant.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  The first Tomato location opened in San Francisco's Marina district, featuring a seasonal menu built entirely around ingredients sourced from farms within 150 miles. The response was immediate and enthusiastic, leading to our expansion across the Bay Area.
                </p>
              </div>
              <div>
                <img
                  src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80"
                  alt="Farmers market produce"
                  className="w-full h-auto rounded-lg shadow-lg"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Values */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-tomato-500 font-medium">OUR PRINCIPLES</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mt-2 mb-6">Mission & Values</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="text-tomato-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                    <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif font-bold mb-4">Fresh, Local Ingredients</h3>
                <p className="text-gray-700">
                  We partner with local farms and producers to source the freshest seasonal ingredients, supporting sustainable agriculture and reducing our carbon footprint.
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="text-tomato-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif font-bold mb-4">Thoughtful Preparation</h3>
                <p className="text-gray-700">
                  We believe in respecting ingredients by preparing them in ways that enhance their natural flavors and nutritional value, creating food that's both delicious and nourishing.
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="text-tomato-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif font-bold mb-4">Sustainable Practices</h3>
                <p className="text-gray-700">
                  From compostable packaging to energy-efficient kitchens, we're committed to reducing our environmental impact at every step of our operation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Meet the Team */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-tomato-500 font-medium">OUR TEAM</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mt-2 mb-6">Meet the People Behind Tomato</h2>
              <p className="text-gray-700">
                Our diverse team of passionate food lovers, sustainability advocates, and hospitality experts work together to deliver an exceptional dining experience.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {team.map(member => (
                <TeamMember key={member.id} member={member} />
              ))}
            </div>
          </div>
        </section>

        {/* Partnerships */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-tomato-500 font-medium">COLLABORATIONS</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mt-2 mb-6">Our Partners</h2>
              <p className="text-gray-700">
                We're proud to work with these organizations and businesses that share our commitment to quality, sustainability, and community.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
              <div className="bg-white p-6 rounded-lg shadow-sm flex items-center justify-center h-32">
                <span className="text-gray-400 text-center font-medium">Bay Area Organic Farmers Association</span>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm flex items-center justify-center h-32">
                <span className="text-gray-400 text-center font-medium">California Sustainable Restaurant Coalition</span>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm flex items-center justify-center h-32">
                <span className="text-gray-400 text-center font-medium">Zero Waste Initiative</span>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm flex items-center justify-center h-32">
                <span className="text-gray-400 text-center font-medium">Urban Farming Project</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default About;
