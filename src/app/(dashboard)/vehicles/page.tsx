import { getHomelab } from "@/lib/data/homelab";
import { VehiclesPage } from "@/components/pages/Vehicles";

export default async function Page() {
  const data = await getHomelab();
  return <VehiclesPage data={data} />;
}
