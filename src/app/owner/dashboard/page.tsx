import Link from "next/link";
import OwnerHeroCarousel from "./OwnerHeroCarousel";
import OwnerPropertyModal from "@/components/owner/OwnerPropertyModal";
import LocationSelector from "@/components/location/LocationSelector";
import "./owner-dashboard.css";

const navigation = [
  { label: "Overview", href: "/owner/dashboard" },
  { label: "My Properties", href: "/owner/dashboard/properties" },
  { label: "Rooms & Beds", href: "/owner/dashboard/rooms" },
  { label: "Bookings", href: "/owner/dashboard/bookings" },
  { label: "Enquiries", href: "/owner/dashboard/enquiries" },
  { label: "Reviews", href: "/owner/dashboard/reviews" },
  { label: "Earnings", href: "/owner/dashboard/earnings" },
];

const stats = [
  { label: "Properties", value: "0", detail: "Your registered PGs", icon: "⌂" },
  { label: "Rooms", value: "0", detail: "Across your properties", icon: "▤" },
  { label: "Available beds", value: "0", detail: "Ready for occupancy", icon: "▦" },
  { label: "Bookings", value: "0", detail: "Total reservations", icon: "▣" },
];

export default function OwnerDashboard() {
  return (
    <main className="bm-page">

      {/* Main website header */}
      <header className="bm-header">
        <div className="bm-header-inner">
          <Link href="/" className="bm-logo">
            BookMy<span>PG</span>
          </Link>

          <div className="bm-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search properties, localities and PG accommodations"
              aria-label="Search properties"
            />
          </div>

          <div className="bm-header-actions">
            <LocationSelector />
            <button className="bm-profile" type="button">
              <span className="bm-profile-avatar">O</span>
              <span>Owner account</span>
              <span>⌄</span>
            </button>
          </div>
        </div>
      </header>

      {/* Horizontal navigation */}
      <nav className="bm-navigation">
        <div className="bm-navigation-inner">
          <div className="bm-nav-main">
            {navigation.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`bm-nav-link ${index === 0 ? "bm-nav-active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <OwnerPropertyModal />
        </div>
      </nav>

      {/* Dashboard content */}
      <div className="bm-content">

        <OwnerHeroCarousel />

        {/* Performance */}
        <section className="bm-section">
          <div className="bm-section-heading">
            <div>
              <h2>Your business at a glance</h2>
              <p>A quick overview of your PG business.</p>
            </div>
            <span className="bm-period">All time ⌄</span>
          </div>

          <div className="bm-stats-grid">
            {stats.map((stat) => (
              <article className="bm-stat-card" key={stat.label}>
                <div className="bm-stat-top">
                  <span>{stat.label}</span>
                  <span className="bm-stat-icon">{stat.icon}</span>
                </div>
                <strong>{stat.value}</strong>
                <small>{stat.detail}</small>
              </article>
            ))}
          </div>
        </section>

        {/* Property section */}
        <section className="bm-section">
          <div className="bm-section-heading">
            <div>
              <h2>Your properties</h2>
              <p>Manage and keep track of your listed accommodations.</p>
            </div>
            <Link href="/owner/dashboard/properties" className="bm-text-link">
              View all →
            </Link>
          </div>

          <div className="bm-property-empty">
            <div className="bm-empty-symbol">⌂</div>
            <h3>Your property journey starts here</h3>
            <p>
              Add your PG details, upload photos and publish your
              property for customers to discover.
            </p>
            <OwnerPropertyModal label="+ Add a property" variant="empty" />
          </div>
        </section>

        {/* Operational panels */}
        <section className="bm-two-column">
          <article className="bm-panel">
            <div className="bm-section-heading">
              <div>
                <h2>Room availability</h2>
                <p>Track beds across your properties.</p>
              </div>
              <Link href="/owner/dashboard/rooms" className="bm-text-link">
                Manage →
              </Link>
            </div>

            <div className="bm-availability">
              <div className="bm-availability-number">0</div>
              <div>
                <strong>Available beds</strong>
                <p>No rooms have been added yet.</p>
              </div>
            </div>

            <div className="bm-progress">
              <span />
            </div>

            <div className="bm-availability-footer">
              <span>Total beds: 0</span>
              <span>Occupied: 0</span>
            </div>
          </article>

          <article className="bm-panel">
            <div className="bm-section-heading">
              <div>
                <h2>Recent enquiries</h2>
                <p>Stay connected with potential residents.</p>
              </div>
              <Link href="/owner/dashboard/enquiries" className="bm-text-link">
                View all →
              </Link>
            </div>

            <div className="bm-activity-empty">
              <span>✉</span>
              <p>Your customer enquiries will appear here.</p>
            </div>
          </article>
        </section>

        <section className="bm-section bm-bookings-section">
          <div className="bm-section-heading">
            <div>
              <h2>Recent bookings</h2>
              <p>Keep track of your latest reservations.</p>
            </div>
            <Link href="/owner/dashboard/bookings" className="bm-text-link">
              View all →
            </Link>
          </div>

          <div className="bm-booking-empty">
            No bookings to display yet.
          </div>
        </section>

        <footer className="bm-footer">
          <Link href="/" className="bm-logo">
            BookMy<span>PG</span>
          </Link>
          <p>Find your space. Manage your place.</p>
        </footer>

      </div>
    </main>
  );
}





