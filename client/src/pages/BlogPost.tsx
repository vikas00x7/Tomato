import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams, useLocation } from "wouter";
import blogPosts from "../data/blogPosts.json";
import { BlogPost as BlogPostType } from "@/lib/types";

const BlogPost = () => {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);

  useEffect(() => {
    // Find the post with the matching id
    const postId = parseInt(id || "0", 10);
    const foundPost = blogPosts.find(p => p.id === postId);
    
    if (foundPost) {
      setPost(foundPost);
      
      // Find related posts (same category, excluding current post)
      const related = blogPosts
        .filter(p => p.category === foundPost.category && p.id !== foundPost.id)
        .slice(0, 3);
      
      setRelatedPosts(related);
    } else {
      // Redirect to blog page if post not found
      setLocation("/blog");
    }
  }, [id, setLocation]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (!post) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | Tomato Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.featuredImage} />
      </Helmet>

      <main className="bg-white pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          {/* Breadcrumbs */}
          <div className="mb-8 text-sm text-gray-500">
            <Link href="/" className="hover:text-tomato-500 transition-colors">Home</Link> / 
            <Link href="/blog" className="mx-2 hover:text-tomato-500 transition-colors">Blog</Link> / 
            <span className="text-gray-700">{post.title}</span>
          </div>

          <article className="max-w-4xl mx-auto">
            {/* Header */}
            <header className="mb-10">
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <span>{formatDate(post.date)}</span>
                <span className="mx-2">•</span>
                <span>{post.category}</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-gray-900 mb-6">
                {post.title}
              </h1>
              <div className="flex items-center">
                <img 
                  src={post.authorImage} 
                  alt={post.author} 
                  className="w-12 h-12 rounded-full object-cover mr-4"
                  loading="lazy"
                />
                <div>
                  <span className="block font-medium text-gray-900">By {post.author}</span>
                </div>
              </div>
            </header>

            {/* Featured Image */}
            <div className="mb-10">
              <img 
                src={post.featuredImage} 
                alt={post.title} 
                className="w-full h-auto rounded-lg shadow-md"
                loading="eager"
              />
            </div>

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none mb-12 blog-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags/Categories */}
            <div className="mb-12 pt-8 border-t border-gray-200">
              <span className="inline-block bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium mr-2">
                {post.category}
              </span>
            </div>
          </article>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map(relatedPost => (
                  <Link href={`/blog/${relatedPost.id}`} key={relatedPost.id}>
                    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                      <img
                        src={relatedPost.featuredImage}
                        alt={relatedPost.title}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                      <div className="p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>{formatDate(relatedPost.date)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-10">
                <Link 
                  href="/blog" 
                  className="inline-block bg-white border border-tomato-500 text-tomato-500 px-8 py-3 rounded-full font-medium hover:bg-tomato-50 transition-colors"
                >
                  View All Articles
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default BlogPost;
