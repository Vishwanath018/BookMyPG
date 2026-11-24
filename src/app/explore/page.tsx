import ExploreClient from "./ExploreClient";

type ExplorePageProps = {
  searchParams: Promise<{
    location?: string;
    moveIn?: string;
    sharing?: string;
  }>;
};

export const instant = false;

export default async function ExplorePage({
  searchParams,
}: ExplorePageProps) {
  const params = await searchParams;

  return (
    <ExploreClient
      initialLocation={params.location ?? ""}
      initialMoveIn={params.moveIn ?? ""}
      initialSharing={params.sharing ?? "Any sharing"}
    />
  );
}

