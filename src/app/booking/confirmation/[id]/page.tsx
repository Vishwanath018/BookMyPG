import { Suspense } from "react";
import ConfirmationClient from "./ConfirmationClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ConfirmationPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          Loading booking confirmation...
        </main>
      }
    >
      <ConfirmationContent params={params} />
    </Suspense>
  );
}

async function ConfirmationContent({ params }: Props) {
  const { id } = await params;
  return <ConfirmationClient bookingId={id} />;
}