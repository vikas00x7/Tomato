import { Link } from "wouter";
import { useState, useEffect } from "react";
import menuItems from "../../data/menuItems.json";

const PopularDishes = () => {
  const [popularDishes, setPopularDishes] = useState([]);

  useEffect(() => {
    // In a real application, you might have a field that indicates popular items
    // or get this data from an API. For now, we'll just take the first 3 items.
    setPopularDishes(menuItems.slice(0, 3));
  }, []);

  return (
    <section id="menu-preview" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-tomato-500 font-medium">OUR SPECIALTIES</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mt-2 mb-4">Fan Favorites</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Indulge in our most popular dishes, crafted with love and the freshest ingredients.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {popularDishes.map((dish: any) => (
            <div key={dish.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <img
                src={dish.image}
                alt={dish.name}
                className="w-full h-64 object-cover"
                loading="lazy"
              />
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-serif font-bold">{dish.name}</h3>
                  <span className="text-tomato-500 font-medium">${dish.price}</span>
                </div>
                <p className="text-gray-600 mb-4">{dish.description}</p>
                <div className="flex space-x-2 mb-4">
                  {dish.dietaryTags.map((tag: string, index: number) => {
                    let bgColor = "bg-green-100 text-green-800";
                    if (tag === "Gluten-free") bgColor = "bg-yellow-100 text-yellow-800";
                    if (tag === "Protein-rich") bgColor = "bg-blue-100 text-blue-800";
                    
                    return (
                      <span key={index} className={`${bgColor} text-xs px-2 py-1 rounded`}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
                <button className="text-tomato-500 font-medium hover:text-tomato-700 transition-colors inline-flex items-center">
                  Add to Order
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Link href="/menu" className="inline-block bg-tomato-500 text-white px-8 py-3 rounded-full font-medium hover:bg-tomato-600 transition-colors">
            See Full Menu
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PopularDishes;
