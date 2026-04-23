import { getHomelab } from "@/lib/data/homelab";
import { RackPage } from "@/components/pages/Rack";

export default async function Page() {
  const data = await getHomelab();
  return <RackPage data={data} />;
}
