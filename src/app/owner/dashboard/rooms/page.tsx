"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "./rooms.css";

type Property = {
  id: string;
  property_name: string;
  locality: string;
  city: string;
  food_available: boolean;
};

type RoomRate = {
  id: string;
  stay_duration: string;
  meal_plan: string;
  price: number | null;
  is_available: boolean;
};

type RoomImage = {
  id: string;
  image_url: string;
  storage_path: string;
  display_order: number;
};

type Room = {
  id: string;
  property_id: string;
  room_name: string;
  sharing_type: number;
  total_beds: number;
  available_beds: number;
  amenities: string[];
  is_active: boolean;
  room_rates: RoomRate[];
  room_images: RoomImage[];
};

const AMENITIES = [
  "AC",
  "Attached Bathroom",
  "Balcony",
  "Wardrobe",
  "Study Table",
  "Wi-Fi",
  "Fan",
  "Hot Water",
  "Window",
  "TV"
];

const emptyForm = {
  room_name: "",
  sharing_type: "2",
  total_beds: "2",
  available_beds: "2",
  price_without_food: "",
  price_with_food: "",
  amenities: [] as string[]
};

export default function RoomsPage() {
  const [supabase] = useState(() => createClient());

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<RoomImage[]>([]);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRooms = useCallback(async (propertyId: string) => {
    const { data, error: queryError } = await supabase
      .from("rooms")
      .select(`
        id,
        property_id,
        room_name,
        sharing_type,
        total_beds,
        available_beds,
        amenities,
        is_active,
        room_images (
          id,
          image_url,
          storage_path,
          display_order
        ),
        room_rates (
          id,
          stay_duration,
          meal_plan,
          price,
          is_available
        )
      `)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    if (queryError) throw queryError;

    setRooms((data ?? []) as Room[]);
  }, [supabase]);

  useEffect(() => {
    async function initialize() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          throw new Error("Please log in to manage your rooms.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (profileError || profile?.role !== "owner") {
          throw new Error("Only PG owners can manage rooms.");
        }

        const { data, error: propertyError } = await supabase
          .from("pg_properties")
          .select("id, property_name, locality, city, food_available")
          .eq("owner_id", authData.user.id)
          .order("created_at", { ascending: false });

        if (propertyError) throw propertyError;

        const list = (data ?? []) as Property[];
        setProperties(list);

        if (list.length > 0) {
          const requestedId = new URLSearchParams(
            window.location.search
          ).get("propertyId");

          const initialProperty =
            list.find(p => p.id === requestedId) ?? list[0];

          setSelectedProperty(initialProperty.id);
          await loadRooms(initialProperty.id);
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Unable to load room management."
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [supabase, loadRooms]);

  async function changeProperty(propertyId: string) {
    setSelectedProperty(propertyId);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setSelectedImages([]);
    setExistingImages([]);
    setError("");
    setMessage("");

    try {
      await loadRooms(propertyId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load rooms.");
    }
  }

  function toggleAmenity(item: string) {
    setForm(current => ({
      ...current,
      amenities: current.amenities.includes(item)
        ? current.amenities.filter(a => a !== item)
        : [...current.amenities, item]
    }));
  }

  function editRoom(room: Room) {
    const withoutFood = room.room_rates.find(
      r => r.stay_duration === "monthly" && r.meal_plan === "without_food"
    );

    const withFood = room.room_rates.find(
      r => r.stay_duration === "monthly" && r.meal_plan === "with_food"
    );

    setForm({
      room_name: room.room_name,
      sharing_type: String(room.sharing_type),
      total_beds: String(room.total_beds),
      available_beds: String(room.available_beds),
      price_without_food: withoutFood?.price?.toString() ?? "",
      price_with_food: withFood?.price?.toString() ?? "",
      amenities: room.amenities ?? []
    });

    setEditingId(room.id);
    setExistingImages([...(room.room_images ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    ));
    setSelectedImages([]);
    setShowForm(true);
    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setSelectedImages([]);
    setExistingImages([]);
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function handleImageSelection(files: FileList | null) {
    if (!files) return;

    const incoming = Array.from(files);
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (existingImages.length + selectedImages.length + incoming.length > 6) {
      setError("You can upload a maximum of 6 images per room.");
      return;
    }

    for (const file of incoming) {
      if (!allowedTypes.includes(file.type)) {
        setError("Only JPG, PNG and WebP images are allowed.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} exceeds the 5 MB file size limit.`);
        return;
      }
    }

    setError("");
    setSelectedImages(current => [...current, ...incoming]);
  }

  async function removeExistingImage(image: RoomImage) {
    if (!editingId) return;

    const confirmed = window.confirm("Remove this room image?");
    if (!confirmed) return;

    setRemovingImageId(image.id);
    setError("");

    try {
      const { error: storageError } = await supabase.storage
        .from("pg-property-images")
        .remove([image.storage_path]);

      if (storageError) throw storageError;

      const { error: databaseError } = await supabase
        .from("room_images")
        .delete()
        .eq("id", image.id)
        .eq("room_id", editingId);

      if (databaseError) {
        throw new Error(
          `Image file was removed, but its database record could not be deleted: ${databaseError.message}`
        );
      }

      setExistingImages(current => current.filter(item => item.id !== image.id));
      await loadRooms(selectedProperty);
      setMessage("Room image removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove image.");
    } finally {
      setRemovingImageId(null);
    }
  }

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProperty) {
      setError("Please select a property.");
      return;
    }

    const total = Number(form.total_beds);
    const available = Number(form.available_beds);
    const sharing = Number(form.sharing_type);
    const withoutFood = Number(form.price_without_food);
    const withFood = form.price_with_food.trim()
      ? Number(form.price_with_food)
      : null;

    if (!form.room_name.trim()) {
      setError("Enter a room name or number.");
      return;
    }

    if (!Number.isInteger(total) || total < 1) {
      setError("Total beds must be at least 1.");
      return;
    }

    if (!Number.isInteger(available) || available < 0 || available > total) {
      setError("Available beds must be between zero and total beds.");
      return;
    }

    if (total < sharing) {
      setError("Total beds cannot be less than the sharing capacity.");
      return;
    }

    if (!Number.isFinite(withoutFood) || withoutFood <= 0) {
      setError("Enter a valid monthly rent without food.");
      return;
    }

    if (withFood !== null && (!Number.isFinite(withFood) || withFood <= 0)) {
      setError("Enter a valid monthly rent with food.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const roomData = {
        property_id: selectedProperty,
        room_name: form.room_name.trim(),
        sharing_type: sharing,
        total_beds: total,
        available_beds: available,
        amenities: form.amenities,
        is_active: editingId
          ? rooms.find(room => room.id === editingId)?.is_active ?? true
          : true
      };

      let roomId = editingId;

      if (editingId) {
        const { error: updateError } = await supabase
          .from("rooms")
          .update(roomData)
          .eq("id", editingId)
          .eq("property_id", selectedProperty);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("rooms")
          .insert(roomData)
          .select("id")
          .single();

        if (insertError) throw insertError;
        roomId = data.id;
      }

      if (!roomId) throw new Error("Unable to identify the saved room.");

      if (selectedImages.length > 0) {
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData.user) {
          throw new Error("Unable to verify owner account for image upload.");
        }

        const uploadedPaths: string[] = [];
        const imageRows: {
          room_id: string;
          property_id: string;
          image_url: string;
          storage_path: string;
          display_order: number;
        }[] = [];

        try {
          for (let index = 0; index < selectedImages.length; index++) {
            const file = selectedImages[index];
            const extension = file.name.split(".").pop()?.toLowerCase();

            if (!extension || !["jpg", "jpeg", "png", "webp"].includes(extension)) {
              throw new Error(`Unsupported image extension: ${file.name}`);
            }

            const path =
              `${authData.user.id}/${selectedProperty}/rooms/${roomId}/${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabase.storage
              .from("pg-property-images")
              .upload(path, file, {
                contentType: file.type,
                upsert: false
              });

            if (uploadError) throw uploadError;

            uploadedPaths.push(path);

            const { data: publicUrlData } = supabase.storage
              .from("pg-property-images")
              .getPublicUrl(path);

            imageRows.push({
              room_id: roomId,
              property_id: selectedProperty,
              image_url: publicUrlData.publicUrl,
              storage_path: path,
              display_order: existingImages.length + index
            });
          }

          const { error: imageInsertError } = await supabase
            .from("room_images")
            .insert(imageRows);

          if (imageInsertError) throw imageInsertError;
        } catch (imageError) {
          if (uploadedPaths.length > 0) {
            await supabase.storage
              .from("pg-property-images")
              .remove(uploadedPaths);
          }

          throw imageError;
        }
      }

      const rateConfigs = [
        {
          meal_plan: "without_food",
          price: withoutFood,
          is_available: true
        },
        {
          meal_plan: "with_food",
          price: withFood,
          is_available: withFood !== null
        }
      ];

      for (const rate of rateConfigs) {
        const { data: existing, error: findError } = await supabase
          .from("room_rates")
          .select("id")
          .eq("room_id", roomId)
          .eq("stay_duration", "monthly")
          .eq("meal_plan", rate.meal_plan)
          .limit(1);

        if (findError) throw findError;

        const rateData = {
          room_id: roomId,
          stay_duration: "monthly",
          meal_plan: rate.meal_plan,
          price: rate.price,
          is_available: rate.is_available
        };

        if (existing && existing.length > 0) {
          const { error: rateError } = await supabase
            .from("room_rates")
            .update(rateData)
            .eq("id", existing[0].id);

          if (rateError) throw rateError;
        } else {
          const { error: rateError } = await supabase
            .from("room_rates")
            .insert(rateData);

          if (rateError) throw rateError;
        }
      }

      await loadRooms(selectedProperty);

      setMessage(editingId ? "Room updated successfully." : "Room added successfully.");
      setForm(emptyForm);
      setSelectedImages([]);
      setExistingImages([]);
      setEditingId(null);
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save room.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRoom(room: Room) {
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("rooms")
      .update({ is_active: !room.is_active })
      .eq("id", room.id)
      .eq("property_id", selectedProperty);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadRooms(selectedProperty);
    setMessage(room.is_active ? "Room deactivated." : "Room activated.");
  }

  async function deleteRoom(room: Room) {
    const confirmed = window.confirm(
      `Delete ${room.room_name}? Its room pricing records will also be deleted.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const roomImages = room.room_images ?? [];
    const imagePaths = roomImages.map(image => image.storage_path);

    if (imagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("pg-property-images")
        .remove(imagePaths);

      if (storageError) {
        setError(`Could not remove room images: ${storageError.message}`);
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from("rooms")
      .delete()
      .eq("id", room.id)
      .eq("property_id", selectedProperty);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadRooms(selectedProperty);
    setMessage("Room deleted successfully.");
  }

  const selected = properties.find(p => p.id === selectedProperty);

  const totalBeds = rooms.reduce((sum, room) => sum + room.total_beds, 0);
  const availableBeds = rooms.reduce(
    (sum, room) => sum + room.available_beds,
    0
  );

  return (
    <main className="rm-page">
      <div className="rm-container">
        <header className="rm-header">
          <div>
            <Link href="/owner/dashboard" className="rm-back">
              ← Back to dashboard
            </Link>
            <span className="rm-eyebrow">PROPERTY OPERATIONS</span>
            <h1>Rooms & Beds</h1>
            <p>Manage room configurations, sharing and monthly pricing.</p>
          </div>

          <button
            className="rm-primary"
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
              setError("");
              setMessage("");
            }}
            disabled={!selectedProperty}
          >
            + Add room
          </button>
        </header>

        {loading && <div className="rm-notice">Loading your properties...</div>}

        {!loading && properties.length === 0 && (
          <section className="rm-empty">
            <h2>No PG property found</h2>
            <p>Add a property before creating rooms and beds.</p>
            <Link href="/owner/dashboard/properties/new" className="rm-primary">
              + List your property
            </Link>
          </section>
        )}

        {!loading && properties.length > 0 && (
          <>
            <section className="rm-property-select">
              <label htmlFor="property">Select PG property</label>
              <select
                id="property"
                value={selectedProperty}
                onChange={e => changeProperty(e.target.value)}
              >
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.property_name} — {property.locality}, {property.city}
                  </option>
                ))}
              </select>
              {selected && (
                <p>{selected.locality}, {selected.city}</p>
              )}
            </section>

            <section className="rm-stats">
              <article>
                <span>Total rooms</span>
                <strong>{rooms.length}</strong>
              </article>
              <article>
                <span>Total beds</span>
                <strong>{totalBeds}</strong>
              </article>
              <article>
                <span>Available beds</span>
                <strong>{availableBeds}</strong>
              </article>
              <article>
                <span>Occupied beds</span>
                <strong>{totalBeds - availableBeds}</strong>
              </article>
            </section>

            {error && <div className="rm-error" role="alert">{error}</div>}
            {message && <div className="rm-success" role="status">{message}</div>}

            {showForm && (
              <section className="rm-form-card">
                <div className="rm-form-heading">
                  <div>
                    <span className="rm-eyebrow">ROOM CONFIGURATION</span>
                    <h2>{editingId ? "Edit room" : "Add a new room"}</h2>
                  </div>
                  <button type="button" className="rm-close" onClick={resetForm}>
                    ✕
                  </button>
                </div>

                <form onSubmit={saveRoom}>
                  <div className="rm-form-grid">
                    <div className="rm-field rm-full">
                      <label>Room name / number *</label>
                      <input
                        value={form.room_name}
                        onChange={e => setForm({ ...form, room_name: e.target.value })}
                        placeholder="Example: Room 101"
                        required
                      />
                    </div>

                    <div className="rm-field">
                      <label>Sharing type *</label>
                      <select
                        value={form.sharing_type}
                        onChange={e => {
                          const sharing = e.target.value;
                          setForm({
                            ...form,
                            sharing_type: sharing,
                            total_beds: String(Math.max(Number(form.total_beds), Number(sharing))),
                            available_beds: String(Math.max(Number(form.available_beds), Number(sharing)))
                          });
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <option key={n} value={n}>
                            {n === 1 ? "Single sharing" : `${n} sharing`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rm-field">
                      <label>Total beds *</label>
                      <input
                        type="number"
                        min={form.sharing_type}
                        value={form.total_beds}
                        onChange={e => setForm({ ...form, total_beds: e.target.value })}
                        required
                      />
                    </div>

                    <div className="rm-field">
                      <label>Available beds *</label>
                      <input
                        type="number"
                        min="0"
                        max={form.total_beds}
                        value={form.available_beds}
                        onChange={e => setForm({ ...form, available_beds: e.target.value })}
                        required
                      />
                    </div>

                    <div className="rm-field">
                      <label>Monthly rent without food (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        value={form.price_without_food}
                        onChange={e => setForm({ ...form, price_without_food: e.target.value })}
                        placeholder="Example: 7500"
                        required
                      />
                    </div>

                    <div className="rm-field">
                      <label>Monthly rent with food (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.price_with_food}
                        onChange={e => setForm({ ...form, price_with_food: e.target.value })}
                        placeholder="Leave blank if unavailable"
                        disabled={!selected?.food_available}
                      />
                      {!selected?.food_available && (
                        <small>Food is not enabled for this property.</small>
                      )}
                    </div>
                  </div>

                  <div className="rm-field rm-full rm-image-upload">
                    <label htmlFor="room-images">Room images</label>
                    <p className="rm-image-help">
                      Upload up to 6 images. JPG, PNG or WebP. Maximum 5 MB each.
                    </p>

                    <input
                      id="room-images"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={event => {
                        handleImageSelection(event.target.files);
                        event.target.value = "";
                      }}
                      disabled={existingImages.length + selectedImages.length >= 6}
                    />

                    {(existingImages.length > 0 || selectedImages.length > 0) && (
                      <div className="rm-image-grid">
                        {existingImages.map(image => (
                          <div className="rm-image-thumb" key={image.id}>
                            <img src={image.image_url} alt="Existing room" />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(image)}
                              disabled={removingImageId === image.id || saving}
                              aria-label="Remove existing image"
                            >
                              {removingImageId === image.id ? "..." : "×"}
                            </button>
                            <span>Saved</span>
                          </div>
                        ))}

                        {selectedImages.map((file, index) => (
                          <div className="rm-image-thumb" key={`${file.name}-${index}`}>
                            <img src={URL.createObjectURL(file)} alt={file.name} />
                            <button
                              type="button"
                              onClick={() => setSelectedImages(current =>
                                current.filter((_, i) => i !== index)
                              )}
                              disabled={saving}
                              aria-label="Remove selected image"
                            >
                              ×
                            </button>
                            <span>New</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <small>
                      {existingImages.length + selectedImages.length} of 6 images selected.
                      New images are uploaded when you save the room.
                    </small>
                  </div>

                  <div className="rm-field rm-full">
                    <label>Room amenities</label>
                    <div className="rm-amenities">
                      {AMENITIES.map(item => (
                        <button
                          type="button"
                          key={item}
                          className={form.amenities.includes(item) ? "selected" : ""}
                          onClick={() => toggleAmenity(item)}
                        >
                          {form.amenities.includes(item) ? "✓ " : "+ "}
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rm-form-actions">
                    <button type="button" className="rm-secondary" onClick={resetForm}>
                      Cancel
                    </button>
                    <button type="submit" className="rm-primary" disabled={saving}>
                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Update room"
                          : "Save room"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="rm-room-section">
              <div className="rm-section-heading">
                <div>
                  <h2>Room configurations</h2>
                  <p>Rooms registered under {selected?.property_name}.</p>
                </div>
                <span>{rooms.length} rooms</span>
              </div>

              {rooms.length === 0 && (
                <div className="rm-empty">
                  <div className="rm-empty-icon">▦</div>
                  <h3>No rooms added yet</h3>
                  <p>Add your first room with its sharing capacity and monthly rent.</p>
                  <button
                    className="rm-primary"
                    onClick={() => setShowForm(true)}
                  >
                    + Create first room
                  </button>
                </div>
              )}

              <div className="rm-room-grid">
                {rooms.map(room => {
                  const withoutFood = room.room_rates.find(
                    r => r.stay_duration === "monthly" && r.meal_plan === "without_food"
                  );

                  const withFood = room.room_rates.find(
                    r => r.stay_duration === "monthly" && r.meal_plan === "with_food"
                  );

                  return (
                    <article className="rm-room-card" key={room.id}>
                      <div className="rm-room-top">
                        <div className="rm-room-icon">▦</div>
                        <span className={room.is_active ? "rm-active" : "rm-inactive"}>
                          {room.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {room.room_images && room.room_images.length > 0 && (
                        <div className="rm-room-gallery">
                          {room.room_images
                            .slice()
                            .sort((a, b) => a.display_order - b.display_order)
                            .map(image => (
                              <img
                                key={image.id}
                                src={image.image_url}
                                alt={`${room.room_name} room`}
                                loading="lazy"
                              />
                            ))}
                        </div>
                      )}

                      <h3>{room.room_name}</h3>
                      <p className="rm-sharing">{room.sharing_type} Sharing</p>

                      <div className="rm-bed-info">
                        <div>
                          <span>Total beds</span>
                          <strong>{room.total_beds}</strong>
                        </div>
                        <div>
                          <span>Available</span>
                          <strong>{room.available_beds}</strong>
                        </div>
                      </div>

                      <div className="rm-prices">
                        <div>
                          <span>Without food</span>
                          <strong>
                            {withoutFood?.price != null
                              ? `₹${Number(withoutFood.price).toLocaleString("en-IN")}`
                              : "Not set"}
                          </strong>
                        </div>
                        <div>
                          <span>With food</span>
                          <strong>
                            {withFood?.is_available && withFood.price != null
                              ? `₹${Number(withFood.price).toLocaleString("en-IN")}`
                              : "Unavailable"}
                          </strong>
                        </div>
                        <small>Per bed / month</small>
                      </div>

                      {room.amenities.length > 0 && (
                        <div className="rm-room-amenities">
                          {room.amenities.map(a => (
                            <span key={a}>{a}</span>
                          ))}
                        </div>
                      )}

                      <div className="rm-card-actions">
                        <button onClick={() => editRoom(room)}>Edit</button>
                        <button onClick={() => toggleRoom(room)}>
                          {room.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button className="rm-delete" onClick={() => deleteRoom(room)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

