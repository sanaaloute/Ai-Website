import { notFound } from "next/navigation";
import { dataSource } from "@/lib/data-source";
import { getCollection } from "@/lib/schema";
import { RecordForm } from "../../../_components/RecordForm";

export const dynamic = "force-dynamic";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ collection: string; id: string }>;
}) {
  const { collection, id } = await params;
  const meta = getCollection(collection);
  if (!meta || meta.auth) notFound();

  const record = await dataSource.get(collection, id);
  if (!record) notFound();

  const initial = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Edit {meta.label}</h1>
      <RecordForm
        collection={collection}
        fields={meta.fields}
        initial={initial}
        recordId={id}
      />
    </div>
  );
}
