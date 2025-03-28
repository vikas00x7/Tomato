import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What are your hours of operation?",
    answer: "Our standard hours are Monday through Friday from 11:00 AM to 9:00 PM, and Saturday through Sunday from 10:00 AM to 10:00 PM. Hours may vary slightly by location, so we recommend checking the specific hours for your preferred Tomato restaurant."
  },
  {
    question: "Do you offer delivery or takeout options?",
    answer: "Yes, we offer both delivery and takeout at all our locations. You can place an order through our website, mobile app, or by calling the restaurant directly. We also partner with several delivery services for your convenience."
  },
  {
    question: "Do you accommodate dietary restrictions and allergies?",
    answer: "Absolutely! Our menu includes options for various dietary preferences, including vegetarian, vegan, and gluten-free choices. We're happy to accommodate allergies and dietary restrictions whenever possible. Please inform your server about any specific needs, and they'll help guide you through safe menu options."
  },
  {
    question: "Can I make a reservation?",
    answer: "Yes, we accept reservations for parties of all sizes. You can make a reservation through our website, by calling us directly, or using restaurant reservation platforms. For larger groups (8 or more), we recommend making reservations at least a week in advance."
  },
  {
    question: "Do you cater for events?",
    answer: "Yes, we offer catering services for both corporate and private events. We have several packages available, and we can also create custom menus to suit your specific needs and preferences. Please contact our catering team at catering@tomatofood.com for more information."
  },
  {
    question: "Is there a dress code?",
    answer: "Tomato has a casual, comfortable atmosphere with no formal dress code. We want our guests to feel at home while enjoying our fresh, delicious food."
  },
  {
    question: "Are there vegetarian or vegan options available?",
    answer: "Yes! We're proud to offer a variety of vegetarian and vegan options on our menu. Our plant-based dishes are created with the same attention to quality and flavor as all our other menu items."
  }
];

const FaqSection = () => {
  return (
    <section>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Find answers to common questions about dining at Tomato.
        </p>
      </div>
      
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-medium text-gray-900">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-600 mb-4">
            Still have questions? Contact us directly
          </p>
          <div className="flex justify-center items-center space-x-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-tomato-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span className="ml-2">(415) 555-0123</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-tomato-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span className="ml-2">info@tomatofood.com</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
