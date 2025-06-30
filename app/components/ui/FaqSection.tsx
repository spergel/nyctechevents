'use client';

import { useEffect } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  faqs: FAQItem[];
  title?: string;
}

export function FaqSection({ faqs, title = "Frequently Asked Questions" }: FaqSectionProps) {
  useEffect(() => {
    // Add FAQ Schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    };
    
    script.textContent = JSON.stringify(faqSchema);
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [faqs]);

  return (
    <section className="my-12">
      <h2 className="text-3xl font-bold mb-8 text-center text-primary">{title}</h2>
      <div className="space-y-6 max-w-4xl mx-auto">
        {faqs.map((faq, index) => (
          <details key={index} className="group border border-primary/20 rounded-lg p-6 hover:border-primary/40 transition-colors">
            <summary className="font-semibold text-lg cursor-pointer list-none flex items-center justify-between">
              <span>{faq.question}</span>
              <span className="text-primary group-open:rotate-180 transition-transform duration-200">▼</span>
            </summary>
            <div className="mt-4 text-muted-foreground leading-relaxed">
              <p>{faq.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

// Pre-built FAQ data for NYC Events
export const nycEventsFAQs: FAQItem[] = [
  {
    question: "How do I find tech events in NYC?",
    answer: "Browse our comprehensive events calendar that aggregates tech meetups, conferences, and networking events across all five boroughs. Filter by date, topic, or location to find events that match your interests."
  },
  {
    question: "Are most NYC tech events free to attend?",
    answer: "Many NYC tech events are free, especially community meetups and networking events. Premium conferences and workshops may have ticket fees. Check each event's details for pricing information."
  },
  {
    question: "What types of tech communities are active in NYC?",
    answer: "NYC has diverse tech communities including startups, AI/ML groups, blockchain communities, design groups, developer meetups, and industry-specific organizations. Our communities directory helps you find groups aligned with your interests."
  },
  {
    question: "How often are events updated on the platform?",
    answer: "Events are updated daily through automated scraping and community submissions. New events are typically visible within 24 hours of being announced."
  },
  {
    question: "Can I add my tech event or community to the platform?",
    answer: "Yes! We welcome community submissions. Events are curated to ensure quality and relevance to NYC's tech ecosystem. Contact us through our submission process."
  },
  {
    question: "What venues commonly host NYC tech events?",
    answer: "Popular venues include coworking spaces like WeWork, tech company offices, universities like NYU and Columbia, and dedicated event spaces in Manhattan and Brooklyn. Our locations directory provides details about each venue."
  },
  {
    question: "Are events suitable for beginners in tech?",
    answer: "Absolutely! Many events are designed for all skill levels. Look for events tagged as 'beginner-friendly' or introductory workshops. Networking events are particularly welcoming to newcomers."
  },
  {
    question: "How do I stay updated on new NYC tech events?",
    answer: "Subscribe to our RSS feed, follow our social media channels, or bookmark our events calendar. We also offer filtered RSS feeds by event type or community."
  }
]; 