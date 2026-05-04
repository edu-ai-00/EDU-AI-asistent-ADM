import { StatsOverview } from "@/components/admin/StatsOverview";

export default function AdminPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Přehled</h1>
        <p className="text-gray-600 mt-1">
          Přehled a klíčové metriky
        </p>
      </div>

      <StatsOverview />
    </div>
  );
}
