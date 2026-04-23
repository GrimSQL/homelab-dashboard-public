import { getHomelab } from "@/lib/data/homelab";
import { EnergyPage } from "@/components/pages/Energy";

export default async function Page() {
  const data = await getHomelab();
  return <EnergyPage data={data} />;
}
