// Add global type declarations for modules without type definitions
declare module 'lucide-react';

// Add specific component typings as needed throughout the project
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
