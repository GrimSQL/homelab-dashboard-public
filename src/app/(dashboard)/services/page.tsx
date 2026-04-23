import { getHomelab } from "@/lib/data/homelab";
import { ServicesPage } from "@/components/pages/Services";

export default async function Page() {
  const data = await getHomelab();
  return <ServicesPage data={data} />;
}
