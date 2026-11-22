"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./new-property.css";

type PropertyLocation = {
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  displayName: string;
};

const amenitiesList = [
  "Wi-Fi", "Power Backup", "Washing Machine", "Refrigerator",
  "Water Purifier", "CCTV", "Security", "Housekeeping",
  "Parking", "Lift", "Gym", "Common TV",
  "Study Room", "Attached Bathroom", "Hot Water"
];

const rulesList = [
  "No Smoking", "No Alcohol", "No Visitors",
  "No Late Entry", "Maintain Cleanliness",
  "No Loud Music", "Follow Entry Timings"
];

export default function NewPropertyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [propertyId, setPropertyId] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState("boys");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [location, setLocation] = useState<PropertyLocation | null>(null);
  const [foodAvailable, setFoodAvailable] = useState(false);
  const [foodType, setFoodType] = useState("veg");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [rules, setRules] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);

  function toggleItem(
    value: string,
    selected: string[],
    setter: (items: string[]) => void
  ) {
    setter(
      selected.includes(value)
        ? selected.filter(item => item !== value)
        : [...selected, value]
    );
  }

  async function detectPropertyLocation() {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Your browser does not support GPS location.");
      return;
    }

    setDetecting(true);
    setMessage("Detecting property location...");

    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const { latitude, longitude, accuracy } = position.coords;

          const response = await fetch(
            `/api/geolocation/reverse?lat=${latitude}&lon=${longitude}`,
            { cache: "no-store" }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Unable to identify this location.");
          }

          setLocation({
            address: data.address,
            locality: data.locality,
            city: data.city,
            state: data.state,
            pincode: data.pincode || "",
            latitude,
            longitude,
            displayName: data.displayName
          });

          setMessage(
            `Location captured. GPS accuracy: approximately ${Math.round(accuracy)} metres.`
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Location detection failed.");
        } finally {
          setDetecting(false);
        }
      },
      geoError => {
        setDetecting(false);
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission denied. Enable GPS permission and try again."
            : "Unable to detect GPS location. Please try again outdoors."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  }

  async function ensureDraft() {
    if (!name.trim()) throw new Error("Enter your PG property name.");
    if (!location) throw new Error("Capture the property GPS location first.");

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new Error("Please log in again to continue.");
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || profile?.role !== "owner") {
      throw new Error("Only registered PG owners can list properties.");
    }

    setOwnerId(userId);

    const propertyData = {
      owner_id: userId,
      property_name: name.trim(),
      property_type: type,
      description: description.trim() || null,
      address: location.address,
      locality: location.locality,
      city: location.city,
      state: location.state,
      pincode: location.pincode || null,
      latitude: location.latitude,
      longitude: location.longitude,
      contact_phone: contactPhone.trim() || null,
      food_available: foodAvailable,
      food_type: foodAvailable ? foodType : null,
      amenities,
      house_rules: rules,
      status: "draft"
    };

    if (propertyId) {
      const { error: updateError } = await supabase
        .from("pg_properties")
        .update(propertyData)
        .eq("id", propertyId)
        .eq("owner_id", userId);

      if (updateError) throw updateError;
      return propertyId;
    }

    const { data, error: insertError } = await supabase
      .from("pg_properties")
      .insert(propertyData)
      .select("id")
      .single();

    if (insertError) throw insertError;

    setPropertyId(data.id);
    return data.id;
  }

  async function saveDraft() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await ensureDraft();
      setMessage("Your property draft has been saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save draft.");
    } finally {
      setLoading(false);
    }
  }

  async function publishProperty() {
    if (photos.length === 0) {
      setError("Please upload at least one property photo.");
      return;
    }

    if (photos.length > 10) {
      setError("You can upload a maximum of 10 photos.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const uploadedPaths: string[] = [];

    try {
      const id = await ensureDraft();

      for (let index = 0; index < photos.length; index++) {
        const file = photos[index];

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error(`${file.name}: Only JPG, PNG and WebP images are allowed.`);
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name}: Image must be smaller than 5 MB.`);
        }

        const extension = file.type === "image/jpeg" ? "jpg" :
          file.type === "image/png" ? "png" : "webp";

        const path = `${ownerId || (await supabase.auth.getUser()).data.user?.id}/${id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("pg-property-images")
          .upload(path, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        uploadedPaths.push(path);

        const { data: publicData } = supabase.storage
          .from("pg-property-images")
          .getPublicUrl(path);

        const { error: imageError } = await supabase
          .from("property_images")
          .insert({
            property_id: id,
            image_url: publicData.publicUrl,
            storage_path: path,
            image_type: index === 0 ? "cover" : "gallery",
            display_order: index
          });

        if (imageError) throw imageError;

        setMessage(`Uploading photos: ${index + 1}/${photos.length}`);
      }

      const { error: activationError } = await supabase.rpc(
        "activate_pg_property",
        { p_property_id: id }
      );

      if (activationError) throw activationError;

      setMessage("Your property is now active!");

      router.push("/owner/dashboard/properties");
      router.refresh();
    } catch (e) {
      // Keep uploaded files and their metadata intact so the owner
      // can retry publishing without uploading the same photos again.
      setError(e instanceof Error ? e.message : "Unable to publish property.");
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    setError("");

    if (step === 1 && !name.trim()) {
      setError("Please enter your PG name.");
      return;
    }

    if (step === 2 && !location) {
      setError("Please capture the property's GPS location.");
      return;
    }

    setStep(current => Math.min(4, current + 1));
  }

  return (
    <main className="np-page">
      <div className="np-container">
        <button className="np-back" onClick={() => router.push("/owner/dashboard")}>
          ← Back to dashboard
        </button>

        <header className="np-header">
          <span className="np-eyebrow">PROPERTY MANAGEMENT</span>
          <h1>List your property</h1>
          <p>Complete the details below to list your PG on BookMyPG.</p>
        </header>

        <div className="np-progress">
          {["Basic details", "Location", "Facilities", "Photos"].map((label, index) => (
            <div className={`np-progress-step ${step >= index + 1 ? "active" : ""}`} key={label}>
              <span>{index + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>

        <section className="np-card">
          {step === 1 && (
            <>
              <h2>Tell us about your PG</h2>
              <p className="np-subtitle">Start with the basic property information.</p>

              <label>Property name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Example: Sunrise PG for Men"
                maxLength={100}
              />

              <label>Property type *</label>
              <div className="np-type-grid">
                {[
                  ["boys", "Boys PG"],
                  ["girls", "Girls PG"],
                  ["co_living", "Co-living"]
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={type === value ? "selected" : ""}
                    onClick={() => setType(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your PG, rooms and nearby facilities..."
                rows={4}
                maxLength={1500}
              />

              <label>Contact phone (optional)</label>
              <input
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="Property contact number"
                type="tel"
                maxLength={20}
              />
            </>
          )}

          {step === 2 && (
            <>
              <h2>Where is your PG located?</h2>
              <p className="np-subtitle">
                Stand at your property and capture its actual GPS location.
              </p>

              <div className="np-gps-box">
                <div className="np-gps-icon">⌖</div>
                <h3>Use current property location</h3>
                <p>We automatically identify the address using your device GPS.</p>
                <button
                  type="button"
                  className="np-primary"
                  onClick={detectPropertyLocation}
                  disabled={detecting}
                >
                  {detecting ? "Detecting location..." : "◎ Detect property location"}
                </button>
              </div>

              {location && (
                <div className="np-location-result">
                  <strong>✓ Location captured</strong>
                  <h3>{location.displayName}</h3>
                  <p>{location.address}</p>
                  <small>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </small>
                  <button type="button" onClick={detectPropertyLocation}>
                    Detect again
                  </button>
                </div>
              )}

              <p className="np-note">
                Make sure you are physically at the PG while capturing its location.
                Your dashboard location is not used for property registration.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Facilities and amenities</h2>
              <p className="np-subtitle">Tell customers what your property offers.</p>

              <label>Food availability</label>
              <div className="np-type-grid">
                <button
                  type="button"
                  className={foodAvailable ? "selected" : ""}
                  onClick={() => setFoodAvailable(true)}
                >
                  Food available
                </button>
                <button
                  type="button"
                  className={!foodAvailable ? "selected" : ""}
                  onClick={() => setFoodAvailable(false)}
                >
                  No food
                </button>
              </div>

              {foodAvailable && (
                <>
                  <label>Food type</label>
                  <div className="np-type-grid">
                    {["veg", "non_veg", "both"].map(value => (
                      <button
                        type="button"
                        key={value}
                        className={foodType === value ? "selected" : ""}
                        onClick={() => setFoodType(value)}
                      >
                        {value === "non_veg" ? "Non-vegetarian" :
                          value === "veg" ? "Vegetarian" : "Both"}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <label>Amenities</label>
              <div className="np-chip-grid">
                {amenitiesList.map(item => (
                  <button
                    type="button"
                    key={item}
                    className={amenities.includes(item) ? "selected" : ""}
                    onClick={() => toggleItem(item, amenities, setAmenities)}
                  >
                    {amenities.includes(item) ? "✓ " : "+ "}{item}
                  </button>
                ))}
              </div>

              <label>House rules</label>
              <div className="np-chip-grid">
                {rulesList.map(item => (
                  <button
                    type="button"
                    key={item}
                    className={rules.includes(item) ? "selected" : ""}
                    onClick={() => toggleItem(item, rules, setRules)}
                  >
                    {rules.includes(item) ? "✓ " : "+ "}{item}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2>Property photos</h2>
              <p className="np-subtitle">
                Upload up to 10 clear photos of your PG.
              </p>

              <label className="np-upload">
                <span>＋</span>
                <strong>Select property photos</strong>
                <small>JPG, PNG or WebP · Maximum 5 MB each</small>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={e => {
                    const selected = Array.from(e.target.files ?? []);
                    setPhotos(selected.slice(0, 10));
                    setError("");
                  }}
                />
              </label>

              {photos.length > 0 && (
                <div className="np-photo-list">
                  {photos.map((photo, index) => (
                    <div key={`${photo.name}-${index}`}>
                      <span>{photo.name}</span>
                      <button
                        type="button"
                        onClick={() => setPhotos(current => current.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="np-review">
                <h3>Review your property</h3>
                <p><strong>Name:</strong> {name}</p>
                <p><strong>Type:</strong> {type.replace("_", " ")}</p>
                <p><strong>Location:</strong> {location?.displayName}</p>
                <p><strong>Food:</strong> {foodAvailable ? foodType : "Not available"}</p>
                <p><strong>Amenities:</strong> {amenities.length} selected</p>
                <p><strong>House rules:</strong> {rules.length} selected</p>
                <p><strong>Photos:</strong> {photos.length} selected</p>
              </div>
            </>
          )}

          {error && <div className="np-error" role="alert">{error}</div>}
          {message && <div className="np-success" role="status">{message}</div>}

          <div className="np-actions">
            {step > 1 && (
              <button
                type="button"
                className="np-secondary"
                disabled={loading}
                onClick={() => {
                  setError("");
                  setStep(current => current - 1);
                }}
              >
                Back
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                className="np-primary"
                disabled={loading}
                onClick={nextStep}
              >
                Continue →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="np-secondary"
                  disabled={loading}
                  onClick={saveDraft}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="np-primary"
                  disabled={loading}
                  onClick={publishProperty}
                >
                  {loading ? "Saving property..." : "Publish property"}
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
