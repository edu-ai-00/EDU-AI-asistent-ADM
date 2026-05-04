import { InfoBox } from "../_components/atoms";

export function Overview() {
  return (
    <section id="overview" className="scroll-mt-20">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        Prehled JSON Formatu
      </h2>
      <p className="text-gray-700 mb-4">
        EduAI Admin podporuje dva hlavni formaty pro definici kurzu a
        vzdelavaciho obsahu. Kazdy format ma sve specificke vlastnosti a
        pouziti.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            V1 Format (Legacy)
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Puvodni format pro jednoduche kurzy. Struktura: Course &rarr;
            Lectures &rarr; Steps.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>&#10003; Jednoducha hierarchie</li>
            <li>&#10003; Zakladni typy kroku (text, image)</li>
            <li>&#10003; Podpora otazek a odpovedi</li>
            <li>&#10007; Bez GPF/FSRS</li>
            <li>&#10007; Bez AI modu</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg border border-green-200 border-2">
          <h3 className="text-lg font-semibold text-green-700 mb-2">
            V2 Format (Doporuceny)
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Moderni format s podporou GPF a FSRS. Struktura: CourseV2
            &rarr; LessonsV2 &rarr; BlocksV2.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>&#10003; Znovupouzitelne bloky s multi-step architekturou</li>
            <li>&#10003; 3 typy bloku: display, question, exercise</li>
            <li>&#10003; GPF (Global Proficiency Framework)</li>
            <li>&#10003; FSRS (Spaced Repetition)</li>
            <li>&#10003; Vetveni kroku pomoci go_to navigace</li>
            <li>&#10003; Hint &amp; Help na urovni kroku i bloku</li>
            <li>&#10003; Detailni metadata pro uceni</li>
          </ul>
        </div>
      </div>

      <InfoBox type="tip">
        Pro nove projekty doporucujeme pouzivat <strong>V2 format</strong>,
        ktery nabizi pokrocile didakticke funkce a adaptivni uceni.
      </InfoBox>
    </section>
  );
}
