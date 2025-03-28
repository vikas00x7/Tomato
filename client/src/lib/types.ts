// Blog Types
export interface BlogPost {
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

// Menu Types
export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  dietaryTags: string[];
}

// Testimonial Types
export interface Testimonial {
  id: number;
  name: string;
  image: string;
  quote: string;
  rating: number;
}

// Team Member Types
export interface TeamMember {
  id: number;
  name: string;
  position: string;
  bio: string;
  image: string;
}

// Location Types
export interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  weekdayHours: string;
  weekendHours: string;
  mapUrl: string;
}
