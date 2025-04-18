import { Link } from "wouter";
import { useEffect, useState } from "react";
import blogPosts from "../../data/blogPosts.json";

// Define the BlogPost interface
interface BlogPost {
  id: number;
  title: string;
  author: string;
  authorImage: string;
  date: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  category: string;
}

const BlogPreview = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  
  useEffect(() => {
    // Get the latest 3 posts
    setPosts(blogPosts.slice(0, 3));
  }, []);
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  return (
    <section id="blog" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-tomato-500 font-medium">OUR BLOG</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mt-2 mb-4">Latest Articles</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Stay updated with the latest food trends, recipes, and Tomato news.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post: BlogPost) => (
            <article key={post.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
              <div className="p-6">
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <span>{formatDate(post.date)}</span>
                  <span className="mx-2">•</span>
                  <span>{post.category}</span>
                </div>
                <h3 className="text-xl font-serif font-bold mb-2">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center">
                  <img
                    src={post.authorImage}
                    alt={post.author}
                    className="w-8 h-8 rounded-full object-cover mr-3"
                    loading="lazy"
                  />
                  <span className="text-sm">by {post.author}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Link href="/blog" className="inline-block bg-white border border-tomato-500 text-tomato-500 px-8 py-3 rounded-full font-medium hover:bg-tomato-50 transition-colors">
            View All Articles
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogPreview;
