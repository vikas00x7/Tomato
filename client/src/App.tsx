import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Contact from "./pages/Contact";
import Paywall from "./pages/Paywall";
import Admin from "./pages/Admin";
import Blocked from "./pages/Blocked";
import { useNavigationLogger } from "./hooks/useNavigationLogger";
import { FingerprintProvider } from "./components/providers/FingerprintProvider";

function Router() {
  // Track client-side navigation for logging
  useNavigationLogger();

  return (
    <>
      <Switch>
        {/* Paywall route doesn't include Header and Footer */}
        <Route path="/paywall">
          <Paywall />
        </Route>
        
        {/* Blocked page for unauthorized bots */}
        <Route path="/blocked">
          <Blocked />
        </Route>
        
        {/* All other routes include Header and Footer */}
        {/* Admin route doesn't include Header and Footer */}
        <Route path="/admin">
          <Admin />
        </Route>
        
        {/* Regular pages with Header and Footer */}
        <Route>
          <Header />
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/menu" component={Menu} />
            <Route path="/about" component={About} />
            <Route path="/blog" component={Blog} />
            <Route path="/blog/:id" component={BlogPost} />
            <Route path="/contact" component={Contact} />
            <Route component={NotFound} />
          </Switch>
          <Footer />
        </Route>
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FingerprintProvider>
        <Router />
        <Toaster />
      </FingerprintProvider>
    </QueryClientProvider>
  );
}

export default App;
