import { Link } from "wouter";
import { BlogPost } from "@/lib/types";

interface BlogCardProps {
  post: BlogPost;
}

const BlogCard = ({ post }: BlogCardProps) => {
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <article className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
      <Link href={`/blog/${post.id}`}>
        <div className="relative overflow-hidden aspect-w-16 aspect-h-9">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-48 object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <span>{formatDate(post.date)}</span>
          <span className="mx-2">•</span>
          <span>{post.category}</span>
        </div>
        <Link href={`/blog/${post.id}`}>
          <h3 className="text-xl font-serif font-bold mb-2 hover:text-tomato-500 transition-colors">
            {post.title}
          </h3>
        </Link>
        <p className="text-gray-600 mb-4 flex-grow">{post.excerpt}</p>
        <div className="flex items-center mt-auto">
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
  );
};

export default BlogCard;
