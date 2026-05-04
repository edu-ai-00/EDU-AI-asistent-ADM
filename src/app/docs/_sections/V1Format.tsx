import { CodeBlock, InfoBox, Table } from "../_components/atoms";

export function V1Format() {
  return (
    <>
      {/* V1 FORMAT SECTION */}
      <section id="v1-format" className="scroll-mt-20">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          V1 Format (Legacy)
        </h2>
        <p className="text-gray-700 mb-4">
          V1 format je puvodni jednoducha struktura pro kurzy. Pouziva se
          predevsim pro zpetnou kompatibilitu se starsimi systemy.
        </p>

        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h4 className="font-semibold text-gray-800 mb-2">Hierarchie:</h4>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="bg-blue-100 px-3 py-1 rounded">Course</span>
            <span>&rarr;</span>
            <span className="bg-green-100 px-3 py-1 rounded">Lecture[]</span>
            <span>&rarr;</span>
            <span className="bg-yellow-100 px-3 py-1 rounded">Step[]</span>
            <span>&rarr;</span>
            <span className="bg-orange-100 px-3 py-1 rounded">Answer[]</span>
          </div>
        </div>
      </section>

      {/* V1 Course */}
      <section id="v1-course" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Course (Kurz)
        </h3>
        <p className="text-gray-700 mb-4">
          Korenovy objekt reprezentujici cely kurz. Obsahuje zakladni
          informace a seznam lekcí.
        </p>

        <CodeBlock
          code={`interface Course {
  export_type: "course";     // Identifikator formatu (vzdy "course")
  name: string;              // Nazev kurzu
  description: string;       // Popis kurzu
  lectures: Lecture[];       // Seznam lekci
}`}
        />

        <Table
          headers={["Vlastnost", "Typ", "Povinne", "Popis"]}
          rows={[
            ["export_type", '"course"', "Ano", "Identifikator V1 formatu"],
            ["name", "string", "Ano", "Nazev kurzu (zobrazeny v UI)"],
            ["description", "string", "Ano", "Popis kurzu (muze byt prazdny)"],
            ["lectures", "Lecture[]", "Ano", "Pole lekci v kurzu"],
          ]}
        />
      </section>

      {/* V1 Lecture */}
      <section id="v1-lecture" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Lecture (Lekce)
        </h3>
        <p className="text-gray-700 mb-4">
          Lekce je logicky celek kurzu obsahujici kroky. Kazda lekce ma
          unikatni UUID.
        </p>

        <CodeBlock
          code={`interface Lecture {
  uuid4: string;             // Unikatni identifikator (UUID v4)
  export_type: "lecture";    // Identifikator typu
  name: string;              // Nazev lekce
  description: string;       // Popis lekce
  steps: Step[];             // Seznam kroku v lekci
}`}
        />

        <Table
          headers={["Vlastnost", "Typ", "Povinne", "Popis"]}
          rows={[
            ["uuid4", "string", "Ano", "Unikatni UUID identifikator"],
            ["export_type", '"lecture"', "Ano", 'Vzdy "lecture"'],
            ["name", "string", "Ano", "Nazev lekce"],
            ["description", "string", "Ano", "Popis lekce"],
            ["steps", "Step[]", "Ano", "Pole kroku"],
          ]}
        />
      </section>

      {/* V1 Step */}
      <section id="v1-step" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Step (Krok)</h3>
        <p className="text-gray-700 mb-4">
          Krok je zakladni jednotka obsahu. Muze byt informacni (zobrazeni)
          nebo otazka (s odpovedi).
        </p>

        <CodeBlock
          code={`interface Step {
  uuid4: string;                           // Unikatni identifikator
  step_type: "text" | "image";             // Typ obsahu
  response_type: "information" | "question"; // Rezim kroku
  position: number;                        // Poradi v lekci
  description: string;                     // Interni popis
  free_input: boolean;                     // Povoleni volneho vstupu
  text: string;                            // Hlavni obsah (HTML)
  text2: string;                           // Sekundarni obsah
  text3: string;                           // Terciarni obsah
  answers: Answer[];                       // Odpovedi (pro otazky)
  substeps: SubStep[];                     // Podkroky
}`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Typy kroku (step_type)
        </h4>
        <Table
          headers={["Hodnota", "Popis"]}
          rows={[
            [<code key="text">&quot;text&quot;</code>, "Textovy obsah (HTML formatovani)"],
            [<code key="image">&quot;image&quot;</code>, "Obrazkovy obsah"],
          ]}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Typy odpovedi (response_type)
        </h4>
        <Table
          headers={["Hodnota", "Popis"]}
          rows={[
            [
              <code key="info">&quot;information&quot;</code>,
              "Pouze zobrazeni obsahu (bez interakce)",
            ],
            [
              <code key="q">&quot;question&quot;</code>,
              "Otazka vyzadujici odpoved studenta",
            ],
          ]}
        />

        <InfoBox type="info">
          Pole <code>text</code>, <code>text2</code> a <code>text3</code>{" "}
          mohou obsahovat HTML formatovani vcetne obrazku, odkazu a
          stylovani.
        </InfoBox>
      </section>

      {/* V1 Answer */}
      <section id="v1-answer" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Answer (Odpoved)
        </h3>
        <p className="text-gray-700 mb-4">
          Odpoved definuje moznou reakci na otazku. Obsahuje zpetnou vazbu
          a navigacni akce.
        </p>

        <CodeBlock
          code={`interface Answer {
  text2match: string;        // Text pro porovnani s odpovedi studenta
  description: string;       // Interni popis odpovedi
  answer_type: "text" | "image" | "video" | "link"; // Typ zobrazeni
  position: number;          // Poradi odpovedi
  text: string;              // Text odpovedi
  text2: string;             // Zpetna vazba / dodatecny text
  correct_answer: boolean;   // Je to spravna odpoved?
  visible_answer: boolean;   // Zobrazit odpoved studentovi?
  following_action: "next" | "again" | "lecture" | "course" | "code";
  following_action_id: string | number; // ID cile akce
  subanswers: SubAnswer[];   // Vnorene odpovedi
}`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Nasledujici akce (following_action)
        </h4>
        <Table
          headers={["Hodnota", "Popis", "following_action_id"]}
          rows={[
            [<code key="next">&quot;next&quot;</code>, "Prejdi na dalsi krok", "Nepouziva se"],
            [<code key="again">&quot;again&quot;</code>, "Opakuj aktualni krok", "Nepouziva se"],
            [
              <code key="lecture">&quot;lecture&quot;</code>,
              "Prejdi na konkretni lekci",
              "UUID lekce",
            ],
            [
              <code key="course">&quot;course&quot;</code>,
              "Prejdi na jiny kurz",
              "ID kurzu",
            ],
            [
              <code key="code">&quot;code&quot;</code>,
              "Spust vlastni kod",
              "Kod akce",
            ],
          ]}
        />
      </section>

      {/* V1 Example */}
      <section id="v1-example" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Priklad V1 JSON
        </h3>

        <CodeBlock
          language="json"
          code={`{
  "export_type": "course",
  "name": "Zaklady matematiky",
  "description": "Uvodni kurz matematiky pro zacatecniky",
  "lectures": [
    {
      "uuid4": "550e8400-e29b-41d4-a716-446655440001",
      "export_type": "lecture",
      "name": "Scitani a odcitani",
      "description": "Zakladni aritmeticke operace",
      "steps": [
        {
          "uuid4": "550e8400-e29b-41d4-a716-446655440002",
          "step_type": "text",
          "response_type": "information",
          "position": 1,
          "description": "Uvod do scitani",
          "free_input": false,
          "text": "<h2>Scitani</h2><p>Scitani je jedna ze zakladnich operaci...</p>",
          "text2": "",
          "text3": "",
          "answers": [],
          "substeps": []
        },
        {
          "uuid4": "550e8400-e29b-41d4-a716-446655440003",
          "step_type": "text",
          "response_type": "question",
          "position": 2,
          "description": "Otazka na scitani",
          "free_input": true,
          "text": "<p>Kolik je 2 + 3?</p>",
          "text2": "",
          "text3": "",
          "answers": [
            {
              "text2match": "5",
              "description": "Spravna odpoved",
              "answer_type": "text",
              "position": 1,
              "text": "5",
              "text2": "Vyborne! 2 + 3 = 5",
              "correct_answer": true,
              "visible_answer": true,
              "following_action": "next",
              "following_action_id": "",
              "subanswers": []
            }
          ],
          "substeps": []
        }
      ]
    }
  ]
}`}
        />
      </section>
    </>
  );
}
