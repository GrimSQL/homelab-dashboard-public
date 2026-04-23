import { getHomelab } from "@/lib/data/homelab";
import { ZigbeePage } from "@/components/pages/Zigbee";

export default async function Page() {
  const data = await getHomelab();
  return <ZigbeePage data={data} />;
}
