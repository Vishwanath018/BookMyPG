"use client";

import { useMemo, useState } from "react";
import BackgroundVideo from "./BackgroundVideo";
import CityLandmarkIcon from "./CityLandmarkIcon";
import AuthModal from "./AuthModal";

const popularCities = [
  "Mumbai",
  "Delhi-NCR",
  "Bengaluru",
  "Hyderabad",
  "Chandigarh",
  "Ahmedabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Kochi",
];

const otherCities = [
  "Agra",
  "Ajmer",
  "Amritsar",
  "Bhopal",
  "Coimbatore",
  "Dehradun",
  "Faridabad",
  "Ghaziabad",
  "Gurugram",
  "Indore",
  "Jaipur",
  "Jalandhar",
  "Kanpur",
  "Kochi",
  "Kozhikode",
  "Lucknow",
  "Ludhiana",
  "Mangalore",
  "Mysore",
  "Nagpur",
  "Nashik",
  "Noida",
  "Patna",
  "Surat",
  "Thiruvananthapuram",
  "Vadodara",
  "Varanasi",
  "Visakhapatnam",
];

export default function HomePage() {
  const [location, setLocation] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [sharing, setSharing] = useState("Any sharing");
  const [showCities, setShowCities] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [authAction, setAuthAction] = useState<"login" | "signup" | undefined>();
  const [authRole, setAuthRole] = useState<"customer" | "owner" | undefined>();

  const filteredPopular = useMemo(
    () => popularCities.filter((city) =>
      city.toLowerCase().includes(citySearch.toLowerCase())
    ),
    [citySearch]
  );

  const filteredOther = useMemo(
    () => otherCities.filter((city) =>
      city.toLowerCase().includes(citySearch.toLowerCase())
    ),
    [citySearch]
  );

  function selectCity(city: string) {
    setLocation(city);
    setShowCities(false);
    setCitySearch("");
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!location.trim()) {
      alert("Please enter a city or locality.");
      return;
    }

    const params = new URLSearchParams({
      location,
      moveIn,
      sharing,
    });

    window.location.href = `/explore?${params.toString()}`;
  }

  return (
    <main>
      <section className="hero">
        <BackgroundVideo />
        <div className="hero-overlay" />

        <header className="top-header">
          <a href="/" className="brand" aria-label="BookMyPG home">
            <span>BookMy</span>
            <span className="brand-ticket">PG</span>
          </a>

          <div className="header-actions">
            <button type="button" className="header-link auth-header-button" onClick={() => { setAuthAction("signup"); setAuthRole("owner"); setShowAuth(true); }}>
              <span className="header-icon">⌂</span>
              <span>
                <strong>List your property</strong>
                <small>Start earning with BookMyPG</small>
              </span>
            </button>

            <a href="tel:+910000000000" className="header-link">
              <span className="header-icon">☎</span>
              <span>
                <strong>Contact us</strong>
                <small>We're here to help</small>
              </span>
            </a>

            <button
              type="button"
              className="login-link auth-header-button"
              onClick={() => {
                setAuthAction(undefined);
                setAuthRole(undefined);
                setShowAuth(true);
              }}
            >
              <span>♙</span> Login / Signup
            </button>
          </div>
        </header>

        <nav className="city-nav" aria-label="Popular cities">
          {["Bangalore", "Chennai", "Hyderabad", "Mumbai", "Pune", "Delhi", "Kolkata"].map((city) => (
            <button
              key={city}
              onClick={() => selectCity(city === "Bangalore" ? "Bengaluru" : city)}
              className="city-button"
            >
              {city} <span>⌄</span>
            </button>
          ))}

          <button
            className={`city-button all-cities-button ${showCities ? "active" : ""}`}
            onClick={() => setShowCities(!showCities)}
            aria-expanded={showCities}
          >
            All Cities <span>{showCities ? "⌃" : "⌄"}</span>
          </button>
        </nav>

        {showCities && (
          <>
            <div
              className="cities-backdrop"
              onClick={() => setShowCities(false)}
            />

            <div className="cities-popup">
              <div className="city-search-box">
                <span className="city-search-icon">⌕</span>
                <input
                  type="text"
                  placeholder="Search for your city"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  autoFocus
                />
              </div>

              <button
                className="detect-location"
                onClick={() => {
                  if (!navigator.geolocation) {
                    alert("Location detection is not supported by your browser.");
                    return;
                  }

                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setLocation(
                        `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
                      );
                      setShowCities(false);
                    },
                    () => alert("Unable to detect your location. Please allow location access.")
                  );
                }}
              >
                <span>◎</span> Detect my location
              </button>

              {filteredPopular.length > 0 && (
                <section className="popular-cities-section">
                  <h3>Popular Cities</h3>

                  <div className="popular-cities-grid">
                    {filteredPopular.map((city) => {
                      return (
                        <button
                          key={city}
                          className={`popular-city ${city === "Bengaluru" ? "featured-city" : ""}`}
                          onClick={() => selectCity(city)}
                        >
                          <span className="city-illustration"><CityLandmarkIcon city={city} /></span>
                          <span>{city}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {filteredOther.length > 0 && (
                <section className="other-cities-section">
                  <h3>Other Cities</h3>

                  <div className="other-cities-grid">
                    {filteredOther.map((city) => (
                      <button
                        key={city}
                        onClick={() => selectCity(city)}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {filteredPopular.length === 0 && filteredOther.length === 0 && (
                <p className="no-cities-found">No cities found.</p>
              )}

              <button
                className="hide-cities-button"
                onClick={() => {
                  setShowCities(false);
                  setCitySearch("");
                }}
              >
                Hide all cities
              </button>
            </div>
          </>
        )}

        <div className="hero-content">
          <div className="hero-badge">
            <span>✦</span> Find verified PGs across India
          </div>

          <h1>
            Find Your Perfect
            <br />
            <span>PG Stay</span>
          </h1>

          <p className="hero-description">
            Discover, compare and book verified PG accommodations.
            <br />
            Your next home is just a search away.
          </p>

          <form className="search-panel" onSubmit={handleSearch}>
            <label className="search-field location-field">
              <span className="field-icon">⌕</span>
              <span className="field-content">
                <small>LOCATION</small>
                <input
                  type="text"
                  placeholder="Enter city or locality"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </span>
            </label>

            <label className="search-field">
              <span className="field-icon">▣</span>
              <span className="field-content">
                <small>MOVE-IN DATE</small>
                <input
                  type="date"
                  value={moveIn}
                  onChange={(e) => setMoveIn(e.target.value)}
                />
              </span>
            </label>

            <label className="search-field sharing-field">
              <span className="field-icon">♙</span>
              <span className="field-content">
                <small>ROOM PREFERENCE</small>
                <select
                  value={sharing}
                  onChange={(e) => setSharing(e.target.value)}
                >
                  <option>Any sharing</option>
                  <option>Single sharing</option>
                  <option>Double sharing</option>
                  <option>Triple sharing</option>
                  <option>Four sharing</option>
                </select>
              </span>
            </label>

            <button type="submit" className="search-button">
              Search PGs <span>→</span>
            </button>
          </form>

          <div className="hero-trust">
            <span>✓ Verified properties</span>
            <span>✓ Transparent pricing</span>
            <span>✓ Easy booking</span>
          </div>
        </div>
      </section>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} initialAction={authAction} initialRole={authRole} />}
      <section className="stats-section">
        <div className="stat">
          <span className="stat-icon">⌂</span>
          <div><strong>Verified PGs</strong><small>Trusted properties</small></div>
        </div>
        <div className="stat">
          <span className="stat-icon">◎</span>
          <div><strong>Multiple Cities</strong><small>Across India</small></div>
        </div>
        <div className="stat">
          <span className="stat-icon">♙</span>
          <div><strong>Easy Booking</strong><small>Simple and convenient</small></div>
        </div>
        <div className="stat">
          <span className="stat-icon">★</span>
          <div><strong>Better Living</strong><small>Find your next home</small></div>
        </div>
      </section>
    </main>
  );
}




