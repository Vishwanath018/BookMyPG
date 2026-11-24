"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import "./explore.css";

type Property = {
  id: string;
  property_name: string;
  description: string | null;
  property_type: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  food_available: boolean;
  food_type: string | null;
  amenities: string[] | null;
  property_highlights: string[] | null;
  status: string;
};

type PropertyImage = {
  id: string;
  property_id: string;
  image_url: string;
  image_type: string;
  display_order: number;
};

type Room = {
  id: string;
  property_id: string;
  room_name: string;
  sharing_type: number;
  total_beds: number;
  available_beds: number;
  amenities: string[] | null;
  is_active: boolean;
};

type RoomRate = {
  id: string;
  room_id: string;
  stay_duration: string;
  meal_plan: string;
  price: number;
  is_available: boolean;
};

type Listing = {
  property: Property;
  image: string | null;
  galleryImages: string[];
  rooms: {
    room: Room;
    rates: RoomRate[];
  }[];
  amenities: string[];
  minPrice: number;
  distance: number | null;
  availableBeds: number;
};

type Suggestion = {
  name: string;
  displayName: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};

const AMENITIES = [
  "Wi-Fi",
  "AC",
  "Laundry",
  "CCTV",
  "Parking",
  "Power backup",
  "Gym",
  "Housekeeping",
  "Attached bathroom",
  "Furnished rooms",
];

const SHARING_OPTIONS = [
  { value: 1, label: "Single sharing" },
  { value: 2, label: "Double sharing" },
  { value: 3, label: "Triple sharing" },
  { value: 4, label: "Four sharing" },
  { value: 5, label: "Five sharing" },
  { value: 6, label: "Six sharing" },
];

const CATEGORY_OPTIONS = [
  { value: "boys", label: "Men / Boys" },
  { value: "girls", label: "Women / Girls" },
  { value: "co_living", label: "Co-living" },
];

function AmenityIcon({ name }: { name: string }) {
  const value = name.toLowerCase();
  let type = "default";

  if (value.includes("wi-fi") || value.includes("wifi") || value.includes("internet")) type = "wifi";
  else if (value === "ac" || value.includes("air condition")) type = "ac";
  else if (value.includes("wash") || value.includes("laundry")) type = "laundry";
  else if (value.includes("power") || value.includes("backup")) type = "power";
  else if (value.includes("refrigerator") || value.includes("fridge")) type = "fridge";
  else if (value.includes("water") || value.includes("purifier")) type = "water";
  else if (value.includes("cctv") || value.includes("camera")) type = "camera";
  else if (value.includes("parking")) type = "parking";
  else if (value.includes("gym")) type = "gym";
  else if (value.includes("housekeeping") || value.includes("clean")) type = "clean";
  else if (value.includes("bathroom") || value.includes("bath")) type = "bath";
  else if (value.includes("furnish") || value.includes("bed")) type = "bed";
  else if (value.includes("security")) type = "security";

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {type === "wifi" && <>
        <path d="M2 8.5a15 15 0 0 1 20 0" /><path d="M5 12a10.5 10.5 0 0 1 14 0" />
        <path d="M8.5 15.5a5.3 5.3 0 0 1 7 0" /><path d="M12 19h.01" />
      </>}
      {type === "ac" && <>
        <path d="M12 2v20M4 7l16 10M4 17 20 7" />
        <path d="m9 4 3 2 3-2M9 20l3-2 3 2M3 10l3-1 1-3M17 18l1-3 3-1M3 14l4 1 1 3M16 6l1 3 4 1" />
      </>}
      {type === "laundry" && <>
        <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 8h16M8 5.5h.01M11 5.5h.01" />
        <circle cx="12" cy="14" r="4" />
      </>}
      {type === "power" && <>
        <rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 7V5h8v2M13 9l-3 5h3l-1 3 4-6h-3l1-2" />
      </>}
      {type === "fridge" && <>
        <rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M6 11h12M9 6v2M9 14v3" />
      </>}
      {type === "water" && <>
        <path d="M12 2.5S5.5 10 5.5 14a6.5 6.5 0 0 0 13 0c0-4-6.5-11.5-6.5-11.5Z" /><path d="M9 15a3 3 0 0 0 3 3" />
      </>}
      {type === "camera" && <>
        <path d="M3 8h4l2-2h6l2 2h4v11H3z" /><circle cx="12" cy="13.5" r="3.5" />
      </>}
      {type === "parking" && <>
        <path d="M5 21V3h8a5 5 0 0 1 0 10H5" /><path d="M10 7h3a1.5 1.5 0 0 1 0 3h-3z" />
      </>}
      {type === "gym" && <><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" /></>}
      {type === "clean" && <><path d="m14 3 7 7M12 5l7 7M5 21l8-8M3 19l2 2" /></>}
      {type === "bath" && <><path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM5 12V6a3 3 0 0 1 6 0M7 20v2M17 20v2" /></>}
      {type === "bed" && <><path d="M3 19V6M3 15h18v4M21 19V11a2 2 0 0 0-2-2H9v6M6 12h.01" /></>}
      {type === "security" && <><path d="M12 2 20 5v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5zM9 12l2 2 4-4" /></>}
      {type === "default" && <><path d="m5 12 4 4L19 6" /></>}
    </svg>
  );
}
function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const earthRadius = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance: number | null) {
  if (distance === null) return "Distance unavailable";

  if (distance < 1000) {
    return `${Math.round(distance)} m away`;
  }

  return `${(distance / 1000).toFixed(1)} km away`;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(price);
}

function formatSharing(value: number) {
  const labels: Record<number, string> = {
    1: "Single sharing",
    2: "Double sharing",
    3: "Triple sharing",
    4: "Four sharing",
    5: "Five sharing",
    6: "Six sharing",
  };

  return labels[value] ?? `${value} sharing`;
}

export default function ExploreClient({
  initialLocation,
  initialMoveIn,
  initialSharing,
}: {
  initialLocation: string;
  initialMoveIn: string;
  initialSharing: string;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [location, setLocation] = useState(initialLocation);
  const [locationInput, setLocationInput] = useState(initialLocation);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [moveIn, setMoveIn] = useState(initialMoveIn);

  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchingLocations, setSearchingLocations] = useState(false);

  const [minPrice, setMinPrice] = useState(5000);
  const [maxPrice, setMaxPrice] = useState(25000);
  const [maxDistance, setMaxDistance] = useState(5000);

  const [selectedSharing, setSelectedSharing] = useState<number[]>(
    initialSharing !== "Any sharing"
      ? [Number(initialSharing.match(/\d+/)?.[0] ?? 0)].filter(Boolean)
      : []
  );

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFood, setSelectedFood] = useState("any");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recommended");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchSharing, setSearchSharing] = useState(initialSharing);

  const supabase = useMemo(() => createClient(), []);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: propertyData, error: propertyError } =
        await supabase
          .from("pg_properties")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(100);

      if (propertyError) throw propertyError;

      const properties = (propertyData ?? []) as Property[];

      if (properties.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const propertyIds = properties.map((item) => item.id);

      const [
        { data: imageData, error: imageError },
        { data: roomData, error: roomError },
      ] = await Promise.all([
        supabase
          .from("property_images")
          .select("*")
          .in("property_id", propertyIds)
          .order("display_order", { ascending: true }),

        supabase
          .from("rooms")
          .select("*")
          .in("property_id", propertyIds)
          .eq("is_active", true),
      ]);

      if (imageError) throw imageError;
      if (roomError) throw roomError;

      const rooms = (roomData ?? []) as Room[];
      const images = (imageData ?? []) as PropertyImage[];

      const roomIds = rooms.map((room) => room.id);

      let rates: RoomRate[] = [];

      if (roomIds.length > 0) {
        const { data: rateData, error: rateError } = await supabase
          .from("room_rates")
          .select("*")
          .in("room_id", roomIds)
          .eq("stay_duration", "monthly")
          .eq("is_available", true);

        if (rateError) throw rateError;

        rates = (rateData ?? []) as RoomRate[];
      }

      const results: Listing[] = properties.map((property) => {
        const propertyRooms = rooms.filter(
          (room) => room.property_id === property.id
        );

        const roomEntries = propertyRooms.map((room) => ({
          room,
          rates: rates.filter((rate) => rate.room_id === room.id),
        }));

        const propertyRates = roomEntries.flatMap((entry) => entry.rates);

        const validPrices = propertyRates
          .map((rate) => Number(rate.price))
          .filter((price) => Number.isFinite(price) && price > 0);

        const propertyImage =
          images.find(
            (image) =>
              image.property_id === property.id &&
              image.image_type === "cover"
          ) ??
          images.find((image) => image.property_id === property.id);

        const allAmenities = [
          ...(property.amenities ?? []),
          ...(property.property_highlights ?? []),
          ...propertyRooms.flatMap((room) => room.amenities ?? []),
        ];

        const uniqueAmenities = Array.from(
          new Map(
            allAmenities.map((item) => [normalize(item), item])
          ).values()
        );

        const distance =
          coordinates &&
          property.latitude !== null &&
          property.longitude !== null
            ? haversineDistance(
                coordinates.latitude,
                coordinates.longitude,
                Number(property.latitude),
                Number(property.longitude)
              )
            : null;

        return {
          property,
          image: propertyImage?.image_url ?? null,
          galleryImages: images
            .filter((image) => image.property_id === property.id)
            .map((image) => image.image_url),
          rooms: roomEntries,
          amenities: uniqueAmenities,
          minPrice:
            validPrices.length > 0 ? Math.min(...validPrices) : Infinity,
          distance,
          availableBeds: propertyRooms.reduce(
            (total, room) => total + Math.max(0, room.available_beds),
            0
          ),
        };
      });

      setListings(results);
    } catch (err) {
      console.error("Explore listing error:", err);
      setError("Unable to load PG listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [supabase, coordinates]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useEffect(() => {
    if (initialLocation.trim().length < 2) return;

    const controller = new AbortController();

    async function resolveLocation() {
      try {
        const response = await fetch(
          `/api/geolocation/search?q=${encodeURIComponent(initialLocation)}`,
          { signal: controller.signal }
        );

        if (!response.ok) return;

        const data = await response.json();
        const match = data.suggestions?.[0];

        if (
          match &&
          match.latitude !== null &&
          match.longitude !== null
        ) {
          setCoordinates({
            latitude: Number(match.latitude),
            longitude: Number(match.longitude),
          });
        }
      } catch {
        // Distance remains unavailable until a location is selected.
      }
    }

    resolveLocation();

    return () => controller.abort();
  }, [initialLocation]);

  useEffect(() => {
    if (locationInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (locationInput === location) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearchingLocations(true);

      try {
        const response = await fetch(
          `/api/geolocation/search?q=${encodeURIComponent(locationInput)}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Location search failed");

        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingLocations(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationInput, location]);

  async function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support location detection.");
      return;
    }

    setDetectingLocation(true);
    setLocationMessage("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `/api/geolocation/reverse?lat=${latitude}&lon=${longitude}`,
            { cache: "no-store" }
          );

          if (!response.ok) {
            throw new Error("Unable to resolve your current location.");
          }

          const data = await response.json();

          const displayName =
            data.displayName || data.address;

          if (!displayName) {
            throw new Error("Could not identify your current area.");
          }

          setLocation(displayName);
          setLocationInput(displayName);
          setCoordinates({ latitude, longitude });
          setSuggestions([]);
          setLocationMessage("Location detected successfully.");
        } catch (error) {
          setLocationMessage(
            error instanceof Error
              ? error.message
              : "Unable to identify your location."
          );
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        setDetectingLocation(false);

        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Allow location access in your browser."
            : error.code === error.TIMEOUT
              ? "Location request timed out. Please try again."
              : "Unable to detect location. Please try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }
  function selectLocation(item: Suggestion) {
    setLocation(item.displayName);
    setLocationInput(item.displayName);
    setSuggestions([]);

    if (item.latitude !== null && item.longitude !== null) {
      setCoordinates({
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      });
    } else {
      setCoordinates(null);
    }
  }

  function toggleNumber(
    value: number,
    values: number[],
    setter: (value: number[]) => void
  ) {
    setter(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
    );
  }

  function toggleString(
    value: string,
    values: string[],
    setter: (value: string[]) => void
  ) {
    setter(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
    );
  }

  const filteredListings = useMemo(() => {
    let result = listings.filter((listing) => {
      const property = listing.property;

      if (location.trim()) {
        const search = normalize(location);

        const matchesLocation = [
          property.city,
          property.locality,
          property.address,
          property.state,
        ]
          .filter(Boolean)
          .some((value) => normalize(value).includes(search));

        // A geocoded locality may not exactly match the stored city.
        // When coordinates exist, distance becomes the location criterion.
        if (!matchesLocation && !coordinates) return false;
      }

      if (listing.minPrice < minPrice || listing.minPrice > maxPrice) {
        const matchingRates = listing.rooms.some((entry) =>
          entry.rates.some(
            (rate) =>
              Number(rate.price) >= minPrice &&
              Number(rate.price) <= maxPrice
          )
        );

        if (!matchingRates) return false;
      }

      if (
        coordinates &&
        listing.distance !== null &&
        listing.distance > maxDistance
      ) {
        return false;
      }

      if (
        coordinates &&
        listing.distance === null
      ) {
        return false;
      }

      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(property.property_type)
      ) {
        return false;
      }

      if (
        selectedFood === "with_food" &&
        !listing.rooms.some((entry) =>
          entry.rates.some((rate) => rate.meal_plan === "with_food")
        )
      ) {
        return false;
      }

      if (
        selectedFood === "without_food" &&
        !listing.rooms.some((entry) =>
          entry.rates.some((rate) => rate.meal_plan === "without_food")
        )
      ) {
        return false;
      }

      if (
        selectedSharing.length > 0 &&
        !listing.rooms.some((entry) =>
          selectedSharing.includes(entry.room.sharing_type) &&
          entry.room.available_beds > 0 &&
          entry.rates.length > 0
        )
      ) {
        return false;
      }

      if (
        selectedAmenities.length > 0 &&
        !selectedAmenities.every((wanted) =>
          listing.amenities.some(
            (actual) => normalize(actual) === normalize(wanted)
          )
        )
      ) {
        return false;
      }

      return listing.rooms.some(
        (entry) =>
          entry.room.available_beds > 0 &&
          entry.rates.some(
            (rate) =>
              Number(rate.price) >= minPrice &&
              Number(rate.price) <= maxPrice
          ) &&
          (selectedSharing.length === 0 ||
            selectedSharing.includes(entry.room.sharing_type))
      );
    });

    result = [...result];

    if (sortBy === "price_asc") {
      result.sort((a, b) => a.minPrice - b.minPrice);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.minPrice - a.minPrice);
    } else if (sortBy === "distance" && coordinates) {
      result.sort(
        (a, b) =>
          (a.distance ?? Infinity) - (b.distance ?? Infinity)
      );
    }

    return result;
  }, [
    listings,
    location,
    coordinates,
    minPrice,
    maxPrice,
    maxDistance,
    selectedCategories,
    selectedSharing,
    selectedFood,
    selectedAmenities,
    sortBy,
  ]);

  function resetFilters() {
    setMinPrice(5000);
    setMaxPrice(25000);
    setMaxDistance(5000);
    setSelectedSharing([]);
    setSelectedCategories([]);
    setSelectedFood("any");
    setSelectedAmenities([]);
    setSortBy("recommended");
  }

  function renderFilters() {
    return (
      <div className="explore-filter-content">
        <div className="explore-filter-heading">
          <h2>Filters</h2>
          <button type="button" onClick={resetFilters}>
            Clear all
          </button>
        </div>

        <section className="explore-filter-section">
          <h3>Monthly budget</h3>
          <div className="explore-price-values">
            <span>₹{formatPrice(minPrice)}</span>
            <span>₹{formatPrice(maxPrice)}</span>
          </div>

          <label className="explore-range-label">
            Minimum price
            <input
              type="range"
              min="5000"
              max="25000"
              step="500"
              value={minPrice}
              onChange={(event) =>
                setMinPrice(
                  Math.min(Number(event.target.value), maxPrice)
                )
              }
            />
          </label>

          <label className="explore-range-label">
            Maximum price
            <input
              type="range"
              min="5000"
              max="25000"
              step="500"
              value={maxPrice}
              onChange={(event) =>
                setMaxPrice(
                  Math.max(Number(event.target.value), minPrice)
                )
              }
            />
          </label>
        </section>

        <section className="explore-filter-section">
          <h3>Distance</h3>
          <div className="explore-distance-value">
            {coordinates
              ? `${(maxDistance / 1000).toFixed(1)} km`
              : "Select a location first"}
          </div>
          <input
            type="range"
            min="0"
            max="5000"
            step="100"
            value={maxDistance}
            disabled={!coordinates}
            onChange={(event) =>
              setMaxDistance(Number(event.target.value))
            }
          />
          <div className="explore-range-caption">
            <span>0 m</span>
            <span>5 km</span>
          </div>
        </section>

        <section className="explore-filter-section">
          <h3>PG category</h3>
          {CATEGORY_OPTIONS.map((item) => (
            <label className="explore-check" key={item.value}>
              <input
                type="checkbox"
                checked={selectedCategories.includes(item.value)}
                onChange={() =>
                  toggleString(
                    item.value,
                    selectedCategories,
                    setSelectedCategories
                  )
                }
              />
              <span>{item.label}</span>
            </label>
          ))}
        </section>

        <section className="explore-filter-section">
          <h3>Room sharing</h3>
          {SHARING_OPTIONS.map((item) => (
            <label className="explore-check" key={item.value}>
              <input
                type="checkbox"
                checked={selectedSharing.includes(item.value)}
                onChange={() =>
                  toggleNumber(
                    item.value,
                    selectedSharing,
                    setSelectedSharing
                  )
                }
              />
              <span>{item.label}</span>
            </label>
          ))}
        </section>

        <section className="explore-filter-section">
          <h3>Food preference</h3>
          {[
            { value: "any", label: "Any / Both" },
            { value: "with_food", label: "With food" },
            { value: "without_food", label: "Without food" },
          ].map((item) => (
            <label className="explore-check" key={item.value}>
              <input
                type="radio"
                name="food"
                checked={selectedFood === item.value}
                onChange={() => setSelectedFood(item.value)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </section>

        <section className="explore-filter-section">
          <h3>Amenities</h3>
          {AMENITIES.map((item) => (
            <label className="explore-check" key={item}>
              <input
                type="checkbox"
                checked={selectedAmenities.includes(item)}
                onChange={() =>
                  toggleString(
                    item,
                    selectedAmenities,
                    setSelectedAmenities
                  )
                }
              />
              <span>{item}</span>
            </label>
          ))}
        </section>
      </div>
    );
  }

  return (
    <main className="explore-page">
      <header className="explore-header">
        <Link href="/" className="explore-brand">
          BookMy<span>PG</span>
        </Link>

        <form
          className="explore-search-bar"
          onSubmit={(event) => {
            event.preventDefault();
            const params = new URLSearchParams({
              location,
              moveIn,
              sharing: searchSharing,
            });
            window.location.href = `/explore?${params.toString()}`;
          }}
        >
          <div className="explore-search-location">
            <span>⌖</span>
            <div className="explore-search-field">
              <small>LOCATION</small>
              <input
                value={locationInput}
                onChange={(event) => {
                  setLocationInput(event.target.value);
                  setLocation("");
                  setCoordinates(null);
                }}
                placeholder="Search city or locality"
                aria-label="Search city or locality"
              />
              {searchingLocations && <small>Searching...</small>}
              {suggestions.length > 0 && (
                <div className="explore-location-suggestions">
                  {suggestions.map((item, index) => (
                    <button
                      type="button"
                      key={`${item.displayName}-${index}`}
                      onClick={() => selectLocation(item)}
                    >
                      <strong>{item.name}</strong>
                      <small>{[item.city, item.state].filter(Boolean).join(", ")}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="explore-use-location"
              onClick={detectCurrentLocation}
              disabled={detectingLocation}
            >
              <span>◎</span>
              {detectingLocation ? "Detecting..." : "Use My Location"}
            </button>

            {locationMessage && (
              <small className="explore-location-message" role="status">
                {locationMessage}
              </small>
            )}
          </div>

          <div className="explore-search-divider" />

          <label className="explore-search-field explore-date-field">
            <small>MOVE-IN DATE</small>
            <input
              type="date"
              value={moveIn}
              onChange={(event) => setMoveIn(event.target.value)}
            />
          </label>

          <div className="explore-search-divider" />

          <label className="explore-search-field explore-sharing-field">
            <small>ROOM SHARING</small>
            <select
              value={searchSharing}
              onChange={(event) => {
                setSearchSharing(event.target.value);
                const number = Number(event.target.value.match(/\d+/)?.[0] ?? 0);
                setSelectedSharing(number ? [number] : []);
              }}
            >
              <option value="Any sharing">Any sharing</option>
              <option value="Single sharing">Single sharing</option>
              <option value="Double sharing">Double sharing</option>
              <option value="Triple sharing">Triple sharing</option>
              <option value="Four sharing">Four sharing</option>
              <option value="Five sharing">Five sharing</option>
              <option value="Six sharing">Six sharing</option>
            </select>
          </label>

          <button type="submit" className="explore-search-button">
            Search PGs <span>→</span>
          </button>
        </form>

        <div className="explore-header-actions">
          <Link href="/login" className="explore-account-link" aria-label="Account">
            <span className="explore-account-icon">♙</span>
            <span>Account</span>
          </Link>
        </div>
      </header>

      <div className="explore-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>Find PG accommodations</span>
      </div>

      <div className="explore-main">
        <aside className="explore-sidebar">
          {renderFilters()}
        </aside>

        <section className="explore-results">
          <div className="explore-results-top">
            <div>
              <p className="explore-eyebrow">FIND YOUR NEXT HOME</p>
              <h1>
                PG accommodations
                {location && <span> in {location.split(",")[0]}</span>}
              </h1>
              <p className="explore-results-subtitle">
                Compare rooms, facilities and monthly prices.
              </p>
            </div>

            <div className="explore-results-controls">
              {!loading && !error && (
                <div className="explore-result-count">
                  <strong>{filteredListings.length} properties</strong>
                  <span> matching your preferences</span>
                </div>
              )}
              <button
                type="button"
                className="explore-mobile-filter-button"
                onClick={() => setShowMobileFilters(true)}
              >
                ☷ Filters
              </button>

              <label className="explore-sort">
                <span>Sort by</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_asc">Price: Low to high</option>
                  <option value="price_desc">Price: High to low</option>
                  <option value="distance" disabled={!coordinates}>
                    Distance
                  </option>
                </select>
              </label>
            </div>
          </div>

          {!coordinates && (
            <div className="explore-distance-notice">
              Select a location from the search suggestions to enable
              accurate distance filtering.
            </div>
          )}

          {loading ? (
            <div className="explore-loading">
              <div className="explore-spinner" />
              <p>Finding available PG accommodations...</p>
            </div>
          ) : error ? (
            <div className="explore-error">
              <span>!</span>
              <h2>Unable to load listings</h2>
              <p>{error}</p>
              <button type="button" onClick={loadListings}>
                Try again
              </button>
            </div>
          ) : (
            <>

              {filteredListings.length === 0 ? (
                <div className="explore-empty">
                  <div className="explore-empty-icon">⌂</div>
                  <h2>No PGs found</h2>
                  <p>
                    {listings.length === 0
                      ? "There are currently no approved PG properties available. New properties will appear here once they are registered and approved."
                      : "Try changing your filters or selecting another location to discover available PG accommodations."}
                  </p>
                  <button type="button" onClick={resetFilters}>
                    Clear filters
                  </button>
                  <Link href="/">Back to home</Link>
                </div>
              ) : (
                <div className="explore-listings">
                  {filteredListings.map((listing) => {
                    const property = listing.property;

                    const availableRooms = listing.rooms.filter(
                      (entry) =>
                        entry.room.available_beds > 0 &&
                        entry.rates.some(
                          (rate) =>
                            Number(rate.price) >= minPrice &&
                            Number(rate.price) <= maxPrice &&
                            (selectedSharing.length === 0 ||
                              selectedSharing.includes(
                                entry.room.sharing_type
                              ))
                        )
                    );

                    const prices = availableRooms.flatMap((entry) =>
                      entry.rates
                        .filter(
                          (rate) =>
                            Number(rate.price) >= minPrice &&
                            Number(rate.price) <= maxPrice
                        )
                        .map((rate) => Number(rate.price))
                    );

                    const cardPrice =
                      prices.length > 0
                        ? Math.min(...prices)
                        : listing.minPrice;

                    const shareTypes = Array.from(
                      new Set(
                        availableRooms.map(
                          (entry) => entry.room.sharing_type
                        )
                      )
                    );

                    return (
                      <article
                        className="explore-property-card"
                        key={property.id}
                      >
                        <div className="explore-property-gallery">
                          <div className="explore-property-image">
                            {listing.galleryImages?.[0] ? (
                              <Image
                                src={listing.galleryImages[0]}
                                alt={property.property_name}
                                fill
                                sizes="(max-width: 760px) 100vw, 450px"
                                unoptimized
                              />
                            ) : (
                              <div className="explore-image-placeholder">
                                <span>⌂</span>
                                <small>Property image unavailable</small>
                              </div>
                            )}
                          </div>

                          <div className="explore-gallery-thumbnails">
                            {(listing.galleryImages ?? []).slice(1, 4).map((image, index) => (
                              <div className="explore-gallery-thumb" key={`${image}-${index}`}>
                                <Image
                                  src={image}
                                  alt={`${property.property_name} gallery ${index + 2}`}
                                  fill
                                  sizes="100px"
                                  unoptimized
                                />
                              </div>
                            ))}
                            {(!listing.galleryImages || listing.galleryImages.length <= 1) && (
                              <div className="explore-gallery-empty">PG<br />PHOTO</div>
                            )}
                          </div>
                        </div>

                        <div className="explore-property-info">
                          <div className="explore-property-heading">
                            <div>
                              <span className="explore-verified">✓ APPROVED PROPERTY</span>
                              <h2>{property.property_name}</h2>
                            </div>
                          </div>

                          <p className="explore-property-location">
                            ⌖ {[property.locality, property.city].filter(Boolean).join(", ")}
                          </p>

                          <p className="explore-property-distance">
                            {formatDistance(listing.distance)}
                          </p>

                          <div className="explore-property-tags">
                            <span>
                              {CATEGORY_OPTIONS.find((item) => item.value === property.property_type)?.label ?? property.property_type}
                            </span>
                            {shareTypes.map((share) => (
                              <span key={share}>{formatSharing(share)}</span>
                            ))}
                          </div>

                          <div className="explore-property-amenities">
                            {listing.amenities.slice(0, 5).map((amenity) => (
                              <span key={amenity}>
                                <span className="explore-amenity-icon">
                                  <AmenityIcon name={amenity} />
                                </span>
                                {amenity}
                              </span>
                            ))}
                          </div>

                          <div className="explore-property-food">
                            {Array.from(new Set(
                              availableRooms.flatMap((entry) =>
                                entry.rates.map((rate) => rate.meal_plan)
                              )
                            )).map((food) => (
                              <span key={food}>
                                {food === "with_food" ? "✓ Food available" : "Without food"}
                              </span>
                            ))}
                          </div>

                          <p className="explore-available-beds">
                            {listing.availableBeds} beds available
                          </p>
                        </div>

                        <div className="explore-property-price">
                          <span>MONTHLY RENT STARTING FROM</span>
                          <strong>₹{formatPrice(cardPrice)}</strong>
                          <small>per bed / month</small>

                          <Link
                            href={`/explore/${property.id}`}
                            className="explore-view-button"
                          >
                            View Details
                          </Link>

                          <Link
                            href={`/explore/${property.id}`}
                            className="explore-book-button"
                          >
                            Book Now →
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showMobileFilters && (
        <div className="explore-mobile-filter-overlay">
          <div className="explore-mobile-filter-panel">
            <div className="explore-mobile-filter-header">
              <strong>Filters</strong>
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                aria-label="Close filters"
              >
                ×
              </button>
            </div>

            {renderFilters()}

            <button
              type="button"
              className="explore-mobile-apply"
              onClick={() => setShowMobileFilters(false)}
            >
              Show {filteredListings.length} properties
            </button>
          </div>
        </div>
      )}
    </main>
  );
}





