import { Link } from "wouter";

const AboutPreview = () => {
  return (
    <section id="about-preview" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <span className="text-tomato-500 font-medium">ABOUT TOMATO</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mt-2 mb-6">Our Farm-to-Table Commitment</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              At Tomato, we believe that great food starts with great ingredients. We partner directly with local farmers to bring you the freshest, most flavorful produce possible.
            </p>
            <p className="text-gray-700 mb-8 leading-relaxed">
              Our team of talented chefs transforms these seasonal ingredients into innovative dishes that celebrate the natural flavors of our region, while supporting sustainable agriculture practices.
            </p>
            <Link href="/about" className="inline-flex items-center text-tomato-500 font-medium hover:text-tomato-700 transition-colors">
              Learn More About Our Story
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          <div className="order-1 md:order-2">
            <img
              src="https://images.unsplash.com/photo-1607305387299-a3d9611cd469?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
              alt="Fresh vegetables from local farms"
              className="w-full h-auto rounded-lg shadow-lg"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPreview;
