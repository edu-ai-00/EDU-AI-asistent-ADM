import { CodeBlock, InfoBox } from "../_components/atoms";

export function ImportExport() {
  return (
    <section id="import-export" className="scroll-mt-20">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        Import a Export
      </h2>

      <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
        Automaticka detekce formatu
      </h3>
      <p className="text-gray-700 mb-4">
        Editor automaticky rozpozna format importovaneho JSON souboru:
      </p>

      <CodeBlock
        code={`function detectImportFormat(data: unknown): ImportFormat {
  // V1 Course
  if (data.export_type === "course") {
    return "v1_course";
  }

  // V2 Course
  if (data.export_type === "course_v2") {
    return "v2_course";
  }

  // V2 Block (samostatny blok)
  if (data.export_type === "block_v2" || (data.block_id && data.gpf)) {
    return "v2_block";
  }

  return "unknown";
}`}
      />

      <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">
        Automaticka migrace flat bloku
      </h3>
      <p className="text-gray-700 mb-4">
        Pri importu se starsi bloky s &quot;flat&quot; strukturou (kde <code>content</code>,
        <code>image</code>, <code>video</code>, <code>question</code> jsou primo
        na bloku misto v <code>steps[]</code>) automaticky migruji na novy
        step-based format. Migrace je idempotentni - bloky ktere uz maji
        <code>steps[]</code> se nezmeni.
      </p>

      <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">
        Import samostatneho V2 bloku
      </h3>
      <p className="text-gray-700 mb-4">
        Pokud importujete samostatny V2 blok (bez kurzu), editor ho
        automaticky zabali do docasneho kurzu s jednou lekci pro editaci.
      </p>

      <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">
        Export
      </h3>
      <p className="text-gray-700 mb-4">
        Export vzdy zachova puvodni format (V1 nebo V2). V2 kurz obsahuje
        pole <code>blocks</code> s kompletnimí definicemi vsech bloku vcetne
        jejich <code>steps[]</code>.
      </p>

      <InfoBox type="tip">
        Pro sdileni jednotlivych bloku muzete exportovat kurz a z JSON
        vybrat konkretni blok z pole <code>blocks</code>.
      </InfoBox>
    </section>
  );
}
