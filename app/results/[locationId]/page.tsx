"use client";

import { useParams, useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import Card from "@/components/Card";
import { findLocationById } from "@/lib/data";

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.locationId as string;
  const location = findLocationById(decodeURIComponent(locationId));

  if (!location) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav />
        <div className="mx-auto max-w-7xl px-4 py-12">
          <Card>
            <p>Location not found.</p>
            <button
              onClick={() => router.push("/results")}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Back to Results
            </button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Card>
          <h1 className="mb-4 text-2xl font-bold text-slate-900">{location.name}</h1>
          <p className="text-slate-600">Detailed analysis coming soon...</p>
          <button
            onClick={() => router.push("/results")}
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to Results
          </button>
        </Card>
      </div>
    </div>
  );
}
