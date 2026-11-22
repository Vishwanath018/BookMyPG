"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bookmypg_selected_location";

type Suggestion = {
  name: string;
  displayName: string;
  city: string;
  district: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

export default function LocationSelector() {
  const [location, setLocation] = useState("Select location");
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage("Location detection is not supported.");
      return;
    }

    setLoading(true);
    setMessage("Detecting your current location...");
    setSuggestions([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `/api/geolocation/reverse?lat=${latitude}&lon=${longitude}`
          );

          if (!response.ok) throw new Error();

          const data = await response.json();

          if (!data.displayName) throw new Error();

          setLocation(data.displayName);
          setDraft(data.displayName);
          localStorage.setItem(STORAGE_KEY, data.displayName);
          setMessage("Location updated successfully.");
        } catch {
          setMessage("Unable to identify your area. Search manually.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);

        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Search manually."
            : "Unable to detect location. Please try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      setLocation(saved);
      setDraft(saved);
    } else {
      detectLocation();
    }
  }, [detectLocation]);

  useEffect(() => {
    if (!open || draft.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(
          `/api/geolocation/search?q=${encodeURIComponent(draft.trim())}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error();

        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [draft, open]);

  function selectSuggestion(item: Suggestion) {
    setLocation(item.displayName);
    setDraft(item.displayName);
    localStorage.setItem(STORAGE_KEY, item.displayName);

    setSuggestions([]);
    setMessage("Location selected successfully.");
    setOpen(false);
  }

  function saveManualLocation() {
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }

    setMessage("Please select a location from the suggestions.");
  }

  return (
    <div className="bm-location-wrap">
      <button
        type="button"
        className="bm-location"
        onClick={() => {
          setOpen(current => !current);
          setDraft(location === "Select location" ? "" : location);
          setMessage("");
        }}
        aria-expanded={open}
        aria-label="Select your location"
      >
        <span className="bm-location-pin">⌖</span>
        <span className="bm-location-text">{location}</span>
        <span className="bm-location-chevron">⌄</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="bm-location-backdrop"
            aria-label="Close location selector"
            onClick={() => setOpen(false)}
          />

          <div className="bm-location-dropdown">
            <div className="bm-location-dropdown-heading">
              <strong>Your location</strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <button
              type="button"
              className="bm-detect-location"
              onClick={detectLocation}
              disabled={loading}
            >
              ◎ {loading ? "Detecting..." : "Detect my current location"}
            </button>

            <div className="bm-location-divider">
              <span>OR SEARCH YOUR AREA</span>
            </div>

            <input
              type="text"
              value={draft}
              onChange={event => {
                setDraft(event.target.value);
                setMessage("");
              }}
              onKeyDown={event => {
                if (event.key === "Enter" && suggestions.length > 0) {
                  selectSuggestion(suggestions[0]);
                }
                if (event.key === "Escape") setOpen(false);
              }}
              placeholder="Search area, locality or city"
              aria-label="Search locality or city"
              autoComplete="off"
            />

            {searching && (
              <p className="bm-location-message">Searching locations...</p>
            )}

            {suggestions.length > 0 && (
              <div className="bm-location-suggestions">
                {suggestions.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.displayName}-${index}`}
                    onClick={() => selectSuggestion(item)}
                    className="bm-location-suggestion"
                  >
                    <span className="bm-suggestion-pin">⌖</span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {[item.city, item.state, item.country]
                          .filter(Boolean)
                          .join(", ")}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!searching &&
              draft.trim().length >= 2 &&
              suggestions.length === 0 && (
                <p className="bm-location-message">
                  No matching locations found. Try another spelling.
                </p>
              )}

            <button
              type="button"
              className="bm-location-save"
              onClick={saveManualLocation}
              disabled={suggestions.length === 0}
            >
              Apply location
            </button>

            {message && (
              <p className="bm-location-message" role="status">
                {message}
              </p>
            )}

            <small className="bm-location-attribution">
              Location data © OpenStreetMap contributors
            </small>
          </div>
        </>
      )}
    </div>
  );
}
