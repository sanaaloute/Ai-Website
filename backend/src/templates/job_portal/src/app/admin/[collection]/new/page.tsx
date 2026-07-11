import { notFound } from "next/navigation";
import { getCollection } from "@/lib/schema";
import { RecordForm } from "../../_components/RecordForm";

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const meta = getCollection(collection);
  if (!meta || meta.auth) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">New {meta.label}</h1>
      <RecordForm collection={collection} fields={meta.fields} initial={null} />
    </div>
  );
}
