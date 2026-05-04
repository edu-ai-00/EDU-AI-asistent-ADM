import { CodeBlock, InfoBox, Table } from "../_components/atoms";

export function V2FormatPart2() {
  return (
    <>
      {/* V2 Question Config */}
      <section id="v2-question" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          QuestionConfig (Konfigurace otazky)
        </h3>
        <p className="text-gray-700 mb-4">
          Kroky typu <code>question</code> v blocich <code>question</code> a <code>exercise</code> pouzivaji
          QuestionConfig pro definici otazky, moznych odpovedi a zpetne vazby.
        </p>

        <CodeBlock
          code={`type QuestionType = "open" | "multiple_choice" | "true_false" | "numeric";

interface QuestionConfig {
  type: QuestionType;              // Typ otazky
  options?: QuestionOption[];      // Moznosti pro MCQ a T/F
  correct_answer?: string;         // Spravna odpoved (pro open otazky)
  correct_number?: number;         // Spravna ciselna odpoved (pro numeric otazky)
  tolerance?: number;              // Akceptovatelna odchylka ± (default 0)
  allow_multiple?: boolean;        // Povolit vice odpovedi
  show_answers?: boolean;          // Zobrazit moznosti (default true)
  solution?: string;               // Reseni zobrazene po odpovedi
  solution_image?: StepImage;      // Volitelny obrazek v reseni
}

interface QuestionOption {
  id: string;                      // Unikatni ID moznosti
  text: string;                    // Text moznosti
  is_correct: boolean;             // Je to spravna odpoved?
  feedback?: string;               // Zpetna vazba po vyberu
  feedback_image?: StepImage;      // Obrazek ve zpetne vazbe
  mark?: string;                   // Znamka pro Quiz mod ("1"-"5")
  score_koef?: number;             // Koeficient skore (0-1)
  go_to?: string;                  // Navigace po vyberu
}`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Typy otazek
        </h4>
        <Table
          headers={["Typ", "Cesky", "Popis"]}
          rows={[
            [<code key="open">&quot;open&quot;</code>, "Otevrena odpoved", "Student pise vlastni odpoved"],
            [<code key="mcq">&quot;multiple_choice&quot;</code>, "Vyber z moznosti", "Student vybira z nabizenych moznosti"],
            [<code key="tf">&quot;true_false&quot;</code>, "Ano/Ne", "Student vybira pravda/nepravda"],
            [<code key="numeric">&quot;numeric&quot;</code>, "Ciselna odpoved", "Student zadava cislo, vyhodnoceni s toleranci ±"],
          ]}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Priklad multiple choice otazky (krok v bloku)
        </h4>
        <CodeBlock
          language="json"
          code={`{
  "id": "s2",
  "type": "question",
  "order": 2,
  "question": {
    "type": "multiple_choice",
    "show_answers": true,
    "options": [
      {
        "id": "a",
        "text": "1/2",
        "is_correct": true,
        "feedback": "Spravne! Polovina je 1/2.",
        "go_to": "NEXT_STEP"
      },
      {
        "id": "b",
        "text": "1/3",
        "is_correct": false,
        "feedback": "Nespravne. 1/3 je tretina.",
        "go_to": "s1"
      }
    ],
    "solution": "Spravna odpoved je 1/2 protoze..."
  },
  "hint": "Zamysli se, kolik casti z celku potrebujes."
}`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Priklad otevrene otazky (krok v bloku)
        </h4>
        <CodeBlock
          language="json"
          code={`{
  "id": "s1",
  "type": "question",
  "order": 1,
  "question": {
    "type": "open",
    "correct_answer": "5",
    "solution": "2 + 3 = 5"
  },
  "hint": "Secti obe cisla dohromady."
}`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Znamkovani pro Quiz mod
        </h4>
        <p className="text-gray-700 mb-4">
          Pole <code>mark</code> se pouziva pro export typu <code>quiz_v2</code>.
          Umoznuje prirazovat znamky (1-5) k jednotlivym moznostem.
        </p>
        <CodeBlock
          language="json"
          code={`{
  "options": [
    {
      "id": "a",
      "text": "Uplne spravne",
      "is_correct": true,
      "mark": "1",
      "score_koef": 1.0
    },
    {
      "id": "b",
      "text": "Castecne spravne",
      "is_correct": false,
      "mark": "3",
      "score_koef": 0.5
    }
  ]
}`}
        />

        <InfoBox type="info">
          Pri exportu jako <code>quiz_v2</code> se automaticky odfiltrují pouze bloky
          typu &quot;question&quot; a odstrani se napovedy (<code>hint</code>, <code>help</code>).
          Znamky (<code>mark</code>) zustanou zachovany pro vyhodnoceni testu.
        </InfoBox>
      </section>

      {/* V2 Example */}
      <section id="v2-example" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Kompletni priklad V2 JSON
        </h3>

        <CodeBlock
          language="json"
          code={`{
  "export_type": "course_v2",
  "course_id": "MATH_FRACTIONS_01",
  "version": 1,
  "name": "Zlomky pro zacatecniky",
  "description": "Kompletni kurz o zlomcich",
  "language": "cs",
  "author": "Jan Novak",
  "updated": "2026-02-12T10:30:00.000Z",
  "status": "published",
  "lessons": [
    {
      "lesson_id": "L001",
      "version": 1,
      "name": "Co je zlomek?",
      "description": "Uvod do zlomku",
      "order": 1,
      "blocks": [
        { "block_id": "B001", "order": 1, "default_practice": false },
        { "block_id": "B002", "order": 2, "default_practice": true }
      ]
    }
  ],
  "blocks": [
    {
      "export_type": "block_v2",
      "block_id": "B001",
      "version": 1,
      "language": "cs",
      "author": "Jan Novak",
      "updated": "2026-02-12T10:30:00.000Z",
      "status": "published",
      "type": "display",
      "duration": "3 min",
      "gpf": {
        "domain": "Number and operation",
        "construct": "N2 FRACTIONS",
        "subconstruct": "N2.1 Understand fractions",
        "grade": 4,
        "level": 2
      },
      "learning": {
        "concepts": ["Zlomky", "Citatel", "Jmenovatel"],
        "competencies": { "M.4.5.7": 100 },
        "bloom_level": 2,
        "difficulty": 2,
        "prerequisites": []
      },
      "steps": [
        {
          "id": "s1",
          "type": "text",
          "order": 1,
          "content": "<h2>Co je zlomek?</h2><p>Zlomek je zpusob, jak zapsat cast celku.</p>"
        },
        {
          "id": "s2",
          "type": "image",
          "order": 2,
          "image": {
            "url": "https://example.com/fractions-intro.png",
            "alt": "Uvod do zlomku",
            "position": "below"
          }
        }
      ]
    },
    {
      "export_type": "block_v2",
      "block_id": "B002",
      "version": 1,
      "language": "cs",
      "author": "Jan Novak",
      "updated": "2026-02-12T10:30:00.000Z",
      "status": "published",
      "type": "question",
      "duration": "2 min",
      "gpf": {
        "domain": "Number and operation",
        "construct": "N2 FRACTIONS",
        "subconstruct": "N2.1 Understand fractions",
        "grade": 4,
        "level": 2
      },
      "learning": {
        "concepts": ["Zlomky"],
        "competencies": { "M.4.5.7": 50 },
        "bloom_level": 3,
        "difficulty": 2,
        "prerequisites": []
      },
      "steps": [
        {
          "id": "s1",
          "type": "text",
          "order": 1,
          "content": "<p>Kolik je polovina ze 4?</p>"
        },
        {
          "id": "s2",
          "type": "question",
          "order": 2,
          "question": {
            "type": "multiple_choice",
            "show_answers": true,
            "options": [
              {
                "id": "a",
                "text": "2",
                "is_correct": true,
                "feedback": "Spravne! Polovina ze 4 je 2.",
                "go_to": "NEXT_STEP"
              },
              {
                "id": "b",
                "text": "1",
                "is_correct": false,
                "feedback": "Nespravne. 1 je ctvrtina ze 4.",
                "go_to": "s1"
              }
            ],
            "solution": "Polovina znamena rozdelit na 2 stejne casti. 4 / 2 = 2"
          },
          "hint": "Vydel 4 cislem 2."
        }
      ],
      "hint": "Zamysli se nad polovinou.",
      "help": "Polovina znamena rozdelit na dve stejne casti."
    }
  ]
}`}
        />
      </section>
    </>
  );
}
