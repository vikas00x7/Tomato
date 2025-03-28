import { MenuItem } from "@/lib/types";

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard = ({ item }: MenuItemCardProps) => {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <img
        src={item.image}
        alt={item.name}
        className="w-full h-64 object-cover"
        loading="lazy"
      />
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-serif font-bold">{item.name}</h3>
          <span className="text-tomato-500 font-medium">${item.price}</span>
        </div>
        <p className="text-gray-600 mb-4">{item.description}</p>
        <div className="flex space-x-2 mb-4">
          {item.dietaryTags.map((tag, index) => {
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
  );
};

export default MenuItemCard;
