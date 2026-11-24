"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import OwnerHeroCarousel from "./OwnerHeroCarousel";
import OwnerPropertyModal from "@/components/owner/OwnerPropertyModal";
import LocationSelector from "@/components/location/LocationSelector";
import OwnerLogoutButton from "@/components/owner/OwnerLogoutButton";
import { createClient } from "@/lib/supabase/client";
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

type DashboardStats = {
  properties: number;
  rooms: number;
  availableBeds: number;
  totalBeds: number;
};

const initialStats: DashboardStats = {
  properties: 0,
  rooms: 0,
  availableBeds: 0,
  totalBeds: 0,
};

export default function OwnerDashboard() {
  const [supabase] = useState(() => createClient());
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardStats() {
      try {
        setLoading(true);
        setStatsError("");

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error("Please log in to view your dashboard.");
        }

        // Fetch properties belonging to the logged-in owner.
        const { data: properties, error: propertyError } = await supabase
          .from("pg_properties")
          .select("id")
          .eq("owner_id", authData.user.id);

        if (propertyError) throw propertyError;

        const propertyIds = (properties ?? []).map((property) => property.id);

        if (propertyIds.length === 0) {
          if (!cancelled) setStats(initialStats);
          return;
        }

        // Fetch rooms belonging to all of this owner's properties.
        const { data: rooms, error: roomsError } = await supabase
          .from("rooms")
          .select("id, total_beds, available_beds")
          .in("property_id", propertyIds);

        if (roomsError) throw roomsError;

        const roomList = rooms ?? [];

        const totalBeds = roomList.reduce(
          (sum, room) => sum + Number(room.total_beds || 0),
          0
        );

        const availableBeds = roomList.reduce(
          (sum, room) => sum + Number(room.available_beds || 0),
          0
        );

        if (!cancelled) {
          setStats({
            properties: propertyIds.length,
            rooms: roomList.length,
            totalBeds,
            availableBeds,
          });
        }
      } catch (error) {
        console.error("Dashboard statistics error:", error);

        if (!cancelled) {
          setStatsError(
            error instanceof Error
              ? error.message
              : "Unable to load dashboard statistics."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboardStats();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const occupiedBeds = Math.max(
    0,
    stats.totalBeds - stats.availableBeds
  );

  const occupiedPercentage =
    stats.totalBeds > 0
      ? Math.min(100, (occupiedBeds / stats.totalBeds) * 100)
      : 0;

  const dashboardStats = [
    {
      label: "Properties",
      value: loading ? "..." : String(stats.properties),
      detail: "Your registered PGs",
      icon: "⌂",
    },
    {
      label: "Rooms",
      value: loading ? "..." : String(stats.rooms),
      detail: "Across your properties",
      icon: "▤",
    },
    {
      label: "Available beds",
      value: loading ? "..." : String(stats.availableBeds),
      detail: "Ready for occupancy",
      icon: "▦",
    },
    {
      label: "Bookings",
      value: "0",
      detail: "Total reservations",
      icon: "▣",
    },
  ];

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
            <OwnerLogoutButton />
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
                className={`bm-nav-link ${
                  index === 0 ? "bm-nav-active" : ""
                }`}
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
            {dashboardStats.map((stat) => (
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
            <Link
              href="/owner/dashboard/properties"
              className="bm-text-link"
            >
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
            <OwnerPropertyModal
              label="+ Add a property"
              variant="empty"
            />
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
              <Link
                href="/owner/dashboard/rooms"
                className="bm-text-link"
              >
                Manage →
              </Link>
            </div>

            <div className="bm-availability">
              <div className="bm-availability-number">
                {loading ? "..." : stats.availableBeds}
              </div>
              <div>
                <strong>Available beds</strong>
                <p>
                  {loading
                    ? "Loading room information..."
                    : statsError
                      ? statsError
                      : stats.rooms === 0
                        ? "No rooms have been added yet."
                        : `${stats.rooms} rooms registered across your properties.`}
                </p>
              </div>
            </div>

            <div className="bm-progress">
              <span
                style={{
                  width: `${occupiedPercentage}%`,
                }}
              />
            </div>

            <div className="bm-availability-footer">
              <span>
                Total beds: {loading ? "..." : stats.totalBeds}
              </span>
              <span>
                Occupied: {loading ? "..." : occupiedBeds}
              </span>
            </div>
          </article>

          <article className="bm-panel">
            <div className="bm-section-heading">
              <div>
                <h2>Recent enquiries</h2>
                <p>Stay connected with potential residents.</p>
              </div>
              <Link
                href="/owner/dashboard/enquiries"
                className="bm-text-link"
              >
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
            <Link
              href="/owner/dashboard/bookings"
              className="bm-text-link"
            >
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
