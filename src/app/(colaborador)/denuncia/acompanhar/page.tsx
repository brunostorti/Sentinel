import { TrackReport } from "./track-report";

export default async function TrackReportPage({
  searchParams,
}: {
  searchParams: Promise<{ protocolo?: string }>;
}) {
  const { protocolo } = await searchParams;
  return <TrackReport initialProtocol={protocolo ?? ""} />;
}
