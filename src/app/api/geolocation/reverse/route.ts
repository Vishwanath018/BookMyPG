import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 || lat > 90 ||
    lon < -180 || lon > 180
  ) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "BookMyPG/1.0 (PG accommodation platform)",
        "Accept-Language": "en"
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Location service unavailable." }, { status: 502 });
    }

    const result = await response.json();
    const a = result.address ?? {};

    const locality =
      a.neighbourhood || a.suburb || a.residential ||
      a.quarter || a.village || a.hamlet ||
      a.city_district || a.town || a.city || "";

    const city =
      a.city || a.town || a.municipality ||
      a.city_district || a.county || a.state_district || "";

    const state = a.state || "";
    const pincode = a.postcode || "";
    const address = result.display_name || "";

    if (!address || !locality || !city || !state) {
      return NextResponse.json({
        error: "Could not identify the complete address. Try detecting your location again."
      }, { status: 404 });
    }

    return NextResponse.json({
      address,
      locality,
      city,
      state,
      pincode,
      latitude: lat,
      longitude: lon,
      displayName: [locality, city].filter(Boolean).join(", ")
    }, {
      headers: { "Cache-Control": "private, max-age=3600" }
    });
  } catch {
    return NextResponse.json({ error: "Unable to process location." }, { status: 500 });
  }
}
