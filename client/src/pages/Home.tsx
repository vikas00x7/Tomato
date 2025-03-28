import { Helmet } from "react-helmet";
import HeroSection from "../components/home/HeroSection";
import AboutPreview from "../components/home/AboutPreview";
import PopularDishes from "../components/home/PopularDishes";
import Testimonials from "../components/home/Testimonials";
import CallToAction from "../components/home/CallToAction";
import BlogPreview from "../components/home/BlogPreview";
import LocationsSection from "../components/home/LocationsSection";

const Home = () => {
  return (
    <>
      <Helmet>
        <title>Tomato - Fresh Meets Flavorful</title>
        <meta name="description" content="Discover the taste of locally-sourced ingredients expertly crafted into dishes that nourish both body and soul at Tomato restaurant." />
        <meta property="og:title" content="Tomato - Fresh Meets Flavorful" />
        <meta property="og:description" content="Discover the taste of locally-sourced ingredients expertly crafted into dishes that nourish both body and soul." />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <main>
        <HeroSection />
        <AboutPreview />
        <PopularDishes />
        <Testimonials />
        <CallToAction />
        <BlogPreview />
        <LocationsSection />
      </main>
    </>
  );
};

export default Home;
