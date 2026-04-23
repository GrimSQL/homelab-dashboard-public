import { getHomelab } from "@/lib/data/homelab";
import { HassPage } from "@/components/pages/Hass";

export default async function Page() {
  const data = await getHomelab();
  return <HassPage data={data} />;
}
