"use client";

import { useEffect, useState } from "react";
import OwnerPropertyModal from "@/components/owner/OwnerPropertyModal";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1800&q=85",
    eyebrow: "BOOKMYPG OWNER CENTRE",
    title: "Everything your PG needs, in one place.",
    description: "Manage your properties, rooms, bookings and enquiries with a simpler way to grow your accommodation business.",
  },
  {
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1800&q=85",
    eyebrow: "GROW YOUR ACCOMMODATION BUSINESS",
    title: "Make your property stand out.",
    description: "Showcase your rooms, facilities and amenities to people searching for their next home.",
  },
  {
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1800&q=85",
    eyebrow: "YOUR PROPERTY. YOUR BUSINESS.",
    title: "Manage everything effortlessly.",
    description: "Keep your properties, room availability and customer enquiries organised in one workspace.",
  },
  {
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1800&q=85",
    eyebrow: "WELCOME TO BOOKMYPG",
    title: "A better way to manage your PG.",
    description: "Build your online presence and make your accommodation easier to discover.",
  },
];

export default function OwnerHeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  const previous = () => {
    setActive((current) => (current - 1 + slides.length) % slides.length);
  };

  const next = () => {
    setActive((current) => (current + 1) % slides.length);
  };

  return (
    <section className="bm-hero-carousel" aria-label="BookMyPG highlights">
      {slides.map((slide, index) => (
        <div
          key={slide.image}
          className={`bm-hero-slide ${active === index ? "active" : ""}`}
          style={{ backgroundImage: `url("${slide.image}")` }}
          aria-hidden={active !== index}
        >
          <div className="bm-hero-overlay" />

          <div className="bm-hero-copy">
            <span className="bm-hero-eyebrow">{slide.eyebrow}</span>

            <h1>{slide.title}</h1>

            <p>{slide.description}</p>

            <div
              className="bm-hero-modal-trigger"
              aria-hidden={active !== index}
            >
              <OwnerPropertyModal
                label="List your property →"
                className="bm-hero-cta"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="bm-hero-arrow bm-hero-prev"
        onClick={previous}
        aria-label="Previous slide"
      >
        ‹
      </button>

      <button
        type="button"
        className="bm-hero-arrow bm-hero-next"
        onClick={next}
        aria-label="Next slide"
      >
        ›
      </button>

      <div className="bm-hero-dots">
        {slides.map((slide, index) => (
          <button
            key={slide.image}
            type="button"
            className={`bm-hero-dot ${active === index ? "active" : ""}`}
            onClick={() => setActive(index)}
            aria-label={`Show slide ${index + 1}`}
            aria-current={active === index ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

