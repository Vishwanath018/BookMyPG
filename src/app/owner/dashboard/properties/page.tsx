"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "./properties.css";

type Property = {
  id: string;
  property_name: string;
  property_type: string;
  description: string | null;
  locality: string;
  city: string;
  state: string;
  status: string;
  created_at: string;
  property_images: {
    image_url: string;
    image_type: string;
  }[];
};

export default function PropertiesPage() {
  const supabase = createClient();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProperties() {
      try {
        const { data: userData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !userData.user) {
          throw new Error("Please log in to view your properties.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .single();

        if (profileError || profile?.role !== "owner") {
          throw new Error("Only PG owners can access this page.");
        }

        const { data, error: queryError } = await supabase
          .from("pg_properties")
          .select(`
            id,
            property_name,
            property_type,
            description,
            locality,
            city,
            state,
            status,
            created_at,
            property_images (
              image_url,
              image_type
            )
          `)
          .eq("owner_id", userData.user.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;

        setProperties((data ?? []) as Property[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load properties.");
      } finally {
        setLoading(false);
      }
    }

    loadProperties();
  }, [supabase]);

  function statusLabel(status: string) {
    if (status === "approved") return "Active";
    if (status === "draft") return "Draft";
    if (status === "pending_review") return "Pending review";
    if (status === "rejected") return "Rejected";
    if (status === "suspended") return "Suspended";
    return status;
  }

  return (
    <main className="mp-page">
      <div className="mp-container">
        <header className="mp-header">
          <div>
            <Link href="/owner/dashboard" className="mp-back">
              ← Dashboard
            </Link>
            <h1>My Properties</h1>
            <p>Manage your PG accommodations on BookMyPG.</p>
          </div>

          <Link href="/owner/dashboard/properties/new" className="mp-add">
            + List your property
          </Link>
        </header>

        <div className="mp-summary">
          <div>
            <span>Total properties</span>
            <strong>{properties.length}</strong>
          </div>
          <div>
            <span>Active properties</span>
            <strong>{properties.filter(p => p.status === "approved").length}</strong>
          </div>
          <div>
            <span>Drafts</span>
            <strong>{properties.filter(p => p.status === "draft").length}</strong>
          </div>
        </div>

        {loading && <div className="mp-message">Loading your properties...</div>}

        {error && <div className="mp-error">{error}</div>}

        {!loading && !error && properties.length === 0 && (
          <section className="mp-empty">
            <div className="mp-empty-icon">⌂</div>
            <h2>No properties listed yet</h2>
            <p>
              Start by adding your PG accommodation. Your property will
              appear here once you publish it.
            </p>
            <Link href="/owner/dashboard/properties/new" className="mp-add">
              List your first property
            </Link>
          </section>
        )}

        {!loading && properties.length > 0 && (
          <section className="mp-grid">
            {properties.map(property => {
              const cover =
                property.property_images?.find(image => image.image_type === "cover")
                ?? property.property_images?.[0];

              return (
                <article className="mp-card" key={property.id}>
                  <div className="mp-image">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.image_url} alt={property.property_name} />
                    ) : (
                      <div className="mp-no-image">⌂</div>
                    )}

                    <span className={`mp-status ${property.status}`}>
                      {statusLabel(property.status)}
                    </span>
                  </div>

                  <div className="mp-card-body">
                    <span className="mp-type">
                      {property.property_type.replace("_", " ").toUpperCase()}
                    </span>

                    <h2>{property.property_name}</h2>

                    <p className="mp-location">
                      ⌖ {property.locality}, {property.city}
                    </p>

                    <p className="mp-description">
                      {property.description || "No property description added."}
                    </p>

                    <div className="mp-card-footer">
                      <span>
                        {property.property_images?.length ?? 0} photos
                      </span>
                      <span>
                        Added {new Date(property.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
