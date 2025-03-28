import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import BlogCard from "../components/blog/BlogCard";
import SearchBar from "../components/blog/SearchBar";
import Pagination from "../components/blog/Pagination";
import blogPosts from "../data/blogPosts.json";
import { BlogPost } from "@/lib/types";

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [categories, setCategories] = useState<string[]>([]);
  const postsPerPage = 6;

  useEffect(() => {
    setPosts(blogPosts);
    
    // Extract unique categories
    const allCategories = ["All", ...new Set(blogPosts.map(post => post.category))];
    setCategories(allCategories);
  }, []);

  useEffect(() => {
    // Filter posts based on search term and category
    let filtered = [...posts];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(term) || 
        post.excerpt.toLowerCase().includes(term) || 
        post.content.toLowerCase().includes(term)
      );
    }
    
    if (selectedCategory !== "All") {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }
    
    setFilteredPosts(filtered);
    setCurrentPage(1); // Reset to first page whenever filters change
  }, [searchTerm, selectedCategory, posts]);

  // Get current posts
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Handle search input
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <>
      <Helmet>
        <title>Blog | Tomato Restaurant</title>
        <meta name="description" content="Read about the latest food trends, recipes, and news from Tomato Restaurant." />
      </Helmet>

      <main className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">Our Blog</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stay updated with the latest food trends, recipes, and news from Tomato.
            </p>
          </div>

          {/* Search and Filter Section */}
          <div className="mb-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <SearchBar onSearch={handleSearch} />
              
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
          </div>

          {/* Blog Posts Grid */}
          {currentPosts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {currentPosts.map(post => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
              
              {/* Pagination */}
              <Pagination 
                postsPerPage={postsPerPage} 
                totalPosts={filteredPosts.length} 
                paginate={paginate} 
                currentPage={currentPage}
              />
            </>
          ) : (
            <div className="text-center py-20">
              <h3 className="text-xl font-medium text-gray-800 mb-4">No posts found</h3>
              <p className="text-gray-600 mb-8">Try adjusting your search or browse our categories.</p>
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                }}
                className="bg-tomato-500 text-white px-6 py-2 rounded-full font-medium hover:bg-tomato-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Blog;
