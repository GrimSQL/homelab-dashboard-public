import { getHomelab } from "@/lib/data/homelab";
import { CamerasPage } from "@/components/pages/Cameras";

export default async function Page() {
  const data = await getHomelab();
  return <CamerasPage data={data} />;
}
