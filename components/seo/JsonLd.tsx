/** ฝัง JSON-LD structured data (schema.org) — server component, อ่านโดย Google/บอท */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
