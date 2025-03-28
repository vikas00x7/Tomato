import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import menuItems from "../data/menuItems.json";
import MenuItemCard from "../components/menu/MenuItemCard";

// Type for menu categories and dietary filters
type CategoryType = string;
type DietaryTagType = string;

const Menu = () => {
  const [items, setItems] = useState(menuItems);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [dietaryTags, setDietaryTags] = useState<DietaryTagType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);

  useEffect(() => {
    // Extract unique categories
    const allCategories = ["All", ...new Set(menuItems.map(item => item.category))];
    setCategories(allCategories);

    // Extract unique dietary tags
    const allTags = [...new Set(menuItems.flatMap(item => item.dietaryTags))];
    setDietaryTags(allTags);
  }, []);

  useEffect(() => {
    // Filter items based on selected category and dietary tags
    let filteredItems = [...menuItems];
    
    // Filter by category
    if (selectedCategory !== "All") {
      filteredItems = filteredItems.filter(item => item.category === selectedCategory);
    }
    
    // Filter by dietary tags
    if (selectedDietaryTags.length > 0) {
      filteredItems = filteredItems.filter(item => 
        selectedDietaryTags.every(tag => item.dietaryTags.includes(tag))
      );
    }
    
    setItems(filteredItems);
  }, [selectedCategory, selectedDietaryTags]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleDietaryTagToggle = (tag: string) => {
    if (selectedDietaryTags.includes(tag)) {
      setSelectedDietaryTags(selectedDietaryTags.filter(t => t !== tag));
    } else {
      setSelectedDietaryTags([...selectedDietaryTags, tag]);
    }
  };

  return (
    <>
      <Helmet>
        <title>Menu | Tomato Restaurant</title>
        <meta name="description" content="Explore our diverse menu featuring fresh, locally-sourced ingredients prepared with care." />
      </Helmet>

      <main className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">Our Menu</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our delicious offerings made with fresh, locally-sourced ingredients and prepared with care.
            </p>
          </div>

          {/* Filters */}
          <div className="mb-10">
            <div className="flex flex-col md:flex-row md:justify-between gap-6">
              {/* Category Filter */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-800">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                        selectedCategory === category 
                          ? 'bg-tomato-500 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Filter */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-800">Dietary Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {dietaryTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleDietaryTagToggle(tag)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                        selectedDietaryTags.includes(tag) 
                          ? 'bg-green-500 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items Grid */}
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map(item => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-lg font-medium text-gray-800 mb-2">No items match your filters</h3>
              <p className="text-gray-600">Try adjusting your filters to find something delicious.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Menu;
