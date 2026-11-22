import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2 || query.length > 100) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const url = new URL("https://photon.komoot.io/api/");

    url.searchParams.set("q", query);
    url.searchParams.set("limit", "7");
    url.searchParams.set("lang", "en");
    url.searchParams.set("lat", "12.9716");
    url.searchParams.set("lon", "77.5946");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "BookMyPG/1.0",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Location search unavailable." },
        { status: 502 }
      );
    }

    const data = await response.json();

    const suggestions = (data.features ?? [])
      .map((feature: {
        properties?: Record<string, string>;
        geometry?: { coordinates?: number[] };
      }) => {
        const p = feature.properties ?? {};

        const name = p.name || "";
        const city = p.city || p.town || p.municipality || "";
        const district = p.district || "";
        const state = p.state || "";
        const country = p.country || "";

        const parts = [name];

        if (city && city.toLowerCase() !== name.toLowerCase()) {
          parts.push(city);
        }

        if (state && !parts.some(
          part => part.toLowerCase() === state.toLowerCase()
        )) {
          parts.push(state);
        }

        return {
          name,
          displayName: parts.join(", "),
          city,
          district,
          state,
          country,
          latitude: feature.geometry?.coordinates?.[1] ?? null,
          longitude: feature.geometry?.coordinates?.[0] ?? null,
        };
      })
      .filter((item: { name: string; displayName: string }) =>
        item.name && item.displayName
      );

    return NextResponse.json(
      { suggestions },
      { headers: { "Cache-Control": "private, max-age=30" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to search locations." },
      { status: 500 }
    );
  }
}
