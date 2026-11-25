"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "./details.css";

type Property = {
  id: string;
  property_name: string;
  description: string | null;
  property_type: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  food_available: boolean;
  food_type: string | null;
  amenities: string[] | null;
  property_highlights: string[] | null;
};

type Room = {
  id: string;
  room_name: string;
  sharing_type: number;
  total_beds: number;
  available_beds: number;
  amenities: string[] | null;
};

type Rate = {
  id: string;
  room_id: string;
  stay_duration: string;
  meal_plan: string;
  price: number;
  is_available: boolean;
};

type PropertyImage = {
  id: string;
  image_url: string;
  image_type: string;
  display_order: number;
};

export default function PropertyDetailsClient({
  propertyId,
}: {
  propertyId: string;
}) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedRate, setSelectedRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProperty() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();

        const { data: propertyData, error: propertyError } = await supabase
          .from("pg_properties")
          .select("*")
          .eq("id", propertyId)
          .eq("status", "approved")
          .maybeSingle();

        if (propertyError) throw propertyError;
        if (!propertyData) throw new Error("This PG is unavailable.");

        const [
          { data: roomData, error: roomError },
          { data: imageData, error: imageError },
        ] = await Promise.all([
          supabase.from("rooms")
            .select("*")
            .eq("property_id", propertyId)
            .eq("is_active", true)
            .gt("available_beds", 0),

          supabase.from("property_images")
            .select("*")
            .eq("property_id", propertyId)
            .order("display_order", { ascending: true }),
        ]);

        if (roomError) throw roomError;
        if (imageError) throw imageError;

        const availableRooms = (roomData ?? []) as Room[];
        const roomIds = availableRooms.map((room) => room.id);
        let rateData: Rate[] = [];

        if (roomIds.length) {
          const { data, error: rateError } = await supabase
            .from("room_rates")
            .select("*")
            .in("room_id", roomIds)
            .eq("stay_duration", "monthly")
            .eq("is_available", true);

          if (rateError) throw rateError;
          rateData = (data ?? []) as Rate[];
        }

        if (!active) return;

        setProperty(propertyData as Property);
        setRooms(availableRooms);
        setRates(rateData);
        setImages((imageData ?? []) as PropertyImage[]);

        const firstRoom = availableRooms.find((room) =>
          rateData.some((rate) => rate.room_id === room.id)
        );

        if (firstRoom) {
          setSelectedRoom(firstRoom.id);
          setSelectedRate(
            rateData.find((rate) => rate.room_id === firstRoom.id)?.id ?? ""
          );
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load PG.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProperty();
    return () => { active = false; };
  }, [propertyId]);

  const currentRoom = rooms.find((room) => room.id === selectedRoom);
  const currentRate = rates.find(
    (rate) => rate.id === selectedRate && rate.room_id === selectedRoom
  );

  const coverImage =
    images.find((image) => image.image_type === "cover") ?? images[0];

  function chooseRoom(roomId: string) {
    setSelectedRoom(roomId);
    setSelectedRate(
      rates.find((rate) => rate.room_id === roomId)?.id ?? ""
    );
  }

  async function continueBooking() {
    if (!currentRoom || !currentRate) {
      setError("Select a room with an available monthly rate.");
      return;
    }

    const next =
      `/booking/checkout?propertyId=${encodeURIComponent(propertyId)}` +
      `&roomId=${encodeURIComponent(currentRoom.id)}` +
      `&rateId=${encodeURIComponent(currentRate.id)}`;

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError || !data.user) {
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "customer") {
      setError("Please log in using a customer account to book.");
      return;
    }

    router.push(next);
  }

  if (loading) {
    return <main className="pg-details-state">Loading PG details...</main>;
  }

  if (!property) {
    return (
      <main className="pg-details-state">
        <h2>Unable to open this PG</h2>
        <p>{error || "Property not found."}</p>
        <Link href="/explore">Back to Explore</Link>
      </main>
    );
  }

  const location = [
    property.address,
    property.locality,
    property.city,
    property.state,
    property.pincode,
  ].filter(Boolean).join(", ");

  return (
    <main className="pg-details-page">
      <header className="pg-details-header">
        <Link href="/" className="pg-details-brand">
          BookMy<span>PG</span>
        </Link>
        <Link href="/explore">← Explore PGs</Link>
      </header>

      <div className="pg-details-container">
        <div className="pg-breadcrumb">
          <Link href="/">Home</Link> / <Link href="/explore">Explore</Link> / {property.property_name}
        </div>

        <section className="pg-details-heading">
          <div>
            <span className="pg-approved-label">✓ Approved listing</span>
            <h1>{property.property_name}</h1>
            <p>⌖ {location}</p>
            <span className="pg-type-label">
              {property.property_type.replace("_", " ")}
            </span>
          </div>
        </section>

        <section className="pg-gallery">
          {coverImage ? (
            <img src={coverImage.image_url} alt={property.property_name} />
          ) : (
            <div className="pg-no-image">No property image available</div>
          )}

          <div className="pg-gallery-side">
            {images.filter((image) => image.id !== coverImage?.id)
              .slice(0, 2).map((image) => (
                <img key={image.id} src={image.image_url} alt="PG property" />
              ))}
          </div>
        </section>

        <div className="pg-details-layout">
          <div className="pg-details-main">
            <section className="pg-info-card">
              <h2>About this PG</h2>
              <p>{property.description || "No description provided."}</p>
            </section>

            <section className="pg-info-card">
              <h2>Facilities and amenities</h2>
              <div className="pg-amenities">
                {property.amenities?.length
                  ? property.amenities.map((item) => <span key={item}>✓ {item}</span>)
                  : <p>Amenities not specified.</p>}
              </div>
            </section>

            {property.property_highlights?.length ? (
              <section className="pg-info-card">
                <h2>Property highlights</h2>
                <div className="pg-amenities">
                  {property.property_highlights.map((item) => (
                    <span key={item}>✦ {item}</span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="pg-info-card">
              <h2>Food arrangements</h2>
              <p>
                {property.food_available
                  ? `Food available${property.food_type ? ` — ${property.food_type}` : ""}`
                  : "Food is not provided"}
              </p>
            </section>

            <section className="pg-info-card">
              <h2>Available rooms</h2>

              {rooms.length === 0 ? (
                <p>No rooms currently have available beds.</p>
              ) : (
                <div className="pg-room-list">
                  {rooms.map((room) => {
                    const roomRates = rates.filter(
                      (rate) => rate.room_id === room.id
                    );
                    const price = roomRates.length
                      ? Math.min(...roomRates.map((rate) => Number(rate.price)))
                      : null;

                    return (
                      <button
                        type="button"
                        key={room.id}
                        className={`pg-room-option ${selectedRoom === room.id ? "selected" : ""}`}
                        onClick={() => chooseRoom(room.id)}
                      >
                        <div>
                          <strong>{room.room_name || `${room.sharing_type}-sharing room`}</strong>
                          <span>{room.sharing_type}-sharing · {room.available_beds} beds available</span>
                          {room.amenities?.length
                            ? <small>{room.amenities.join(" · ")}</small>
                            : null}
                        </div>

                        <div className="pg-room-price">
                          {price !== null
                            ? <>₹{price.toLocaleString("en-IN")}<small>/bed/month</small></>
                            : "Rate unavailable"}
                          <span>{selectedRoom === room.id ? "✓ Selected" : "Select room"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="pg-booking-card">
            <span className="pg-booking-eyebrow">YOUR STAY</span>
            <h2>Choose your room</h2>

            {currentRoom && currentRate ? (
              <>
                <div className="pg-selected-room">
                  <strong>{currentRoom.room_name || `${currentRoom.sharing_type}-sharing`}</strong>
                  <span>{currentRoom.sharing_type}-sharing room</span>
                </div>

                <div className="pg-price-row">
                  <span>Monthly rent</span>
                  <strong>₹{Number(currentRate.price).toLocaleString("en-IN")}</strong>
                </div>
                <div className="pg-price-row">
                  <span>Booking payment</span>
                  <strong>₹99</strong>
                </div>
                <p className="pg-booking-note">
                  ₹99 booking payment. Monthly rent is separate.
                </p>
              </>
            ) : (
              <p>Select a room with an available monthly rate.</p>
            )}

            <button
              type="button"
              className="pg-continue-button"
              onClick={continueBooking}
              disabled={!currentRoom || !currentRate}
            >
              Continue to booking →
            </button>

            {error ? <p className="pg-booking-error">{error}</p> : null}
            <p className="pg-secure-note">Secure booking · Transparent pricing</p>
          </aside>
        </div>
      </div>
    </main>
  );
}