import { CodeBlock, InfoBox, Table } from "../_components/atoms";

export function V2FormatPart1() {
  return (
    <>
      {/* V2 FORMAT SECTION */}
      <section id="v2-format" className="scroll-mt-20">
        <h2 className="text-3xl font-bold text-green-700 mb-6">
          V2 Format (GPF + FSRS)
        </h2>
        <p className="text-gray-700 mb-4">
          V2 format je moderni struktura podporujici Global Proficiency
          Framework (GPF) a Free Spaced Repetition Scheduler (FSRS). Nabizi
          znovupouzitelne bloky a AI mody.
        </p>

        <div className="bg-green-50 p-4 rounded-lg mb-6 border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">Hierarchie:</h4>
          <div className="flex items-center gap-2 text-gray-700 flex-wrap">
            <span className="bg-green-200 px-3 py-1 rounded">CourseV2</span>
            <span>&rarr;</span>
            <span className="bg-blue-200 px-3 py-1 rounded">LessonV2[]</span>
            <span>&rarr;</span>
            <span className="bg-purple-200 px-3 py-1 rounded">
              BlockBinding[]
            </span>
            <span>&rarr;</span>
            <span className="bg-orange-200 px-3 py-1 rounded">BlockV2[]</span>
            <span>&rarr;</span>
            <span className="bg-yellow-200 px-3 py-1 rounded">BlockStep[]</span>
          </div>
        </div>

        <InfoBox type="info">
          Bloky (BlockV2) jsou <strong>znovupouzitelne</strong> - jeden
          blok muze byt pouzit ve vice lekcich prostrednictvim BlockBinding.
          Kazdy blok obsahuje pole <code>steps[]</code> s usporadanymi kroky.
          Existuji 3 typy bloku: <strong>display</strong> (zobrazeni), <strong>question</strong> (otazka s vetvenim) a <strong>exercise</strong> (procvicovani).
        </InfoBox>
      </section>

      {/* V2 Course */}
      <section id="v2-course" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          CourseV2 (Kurz V2)
        </h3>
        <p className="text-gray-700 mb-4">
          Hlavni kontejner pro V2 kurz. Obsahuje metadata, lekce a volitelne
          vlozene bloky pro samostatny export.
        </p>

        <CodeBlock
          code={`interface CourseV2 {
  export_type: ExportTypeV2;    // Typ exportu (viz nize)
  course_id: string;            // Unikatni ID kurzu (auto-generovane, readonly)
  version: number;              // Cislo verze kurzu
  name: string;                 // Nazev kurzu
  description: string;          // Popis kurzu
  language: string;             // Jazyk ("cs", "en", ...)
  author: string;               // Autor kurzu
  updated: string;              // ISO timestamp posledni zmeny
  status: BlockStatus;          // Stav kurzu
  only_once?: boolean;          // Jednorazovy kurz (student se nemuze vratit)
  header_image?: HeaderImage;   // Obrazek hlavicky kurzu
  lessons: LessonV2[];          // Seznam lekci
  blocks?: BlockV2[];           // Volitelne: vlozene bloky
}

type ExportTypeV2 = "course_v2" | "exercise_v2" | "quiz_v2";`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Typy exportu (ExportTypeV2)
        </h4>
        <Table
          headers={["Hodnota", "Nazev", "Popis"]}
          rows={[
            [<code key="course_v2">&quot;course_v2&quot;</code>, "Course (Kurz)", "Kompletni kurz se vsemi bloky a lekcemi"],
            [<code key="exercise_v2">&quot;exercise_v2&quot;</code>, "Exercise (Procvicovani)", "Procvicovani s napovedy a resenim"],
            [<code key="quiz_v2">&quot;quiz_v2&quot;</code>, "Quiz (Test)", "Test bez napovedy/reseni, s hodnocenim znamkou"],
          ]}
        />

        <InfoBox type="info">
          <strong>Quiz mod:</strong> Pri exportu jako quiz_v2 se automaticky odfiltrují pouze Exercise bloky
          a odstrani se napovedy (hint, help). Podporuje hodnoceni znamkou (mark).
        </InfoBox>

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Status (Stav)
        </h4>
        <Table
          headers={["Hodnota", "Popis", "Barva v UI"]}
          rows={[
            [<code key="draft">&quot;draft&quot;</code>, "Koncept - rozpracovano", "Seda"],
            [
              <code key="locked">&quot;locked&quot;</code>,
              "Uzamceno - ceka na schvaleni",
              "Zluta",
            ],
            [<code key="approved">&quot;approved&quot;</code>, "Schvaleno - pripraveno", "Modra"],
            [<code key="published">&quot;published&quot;</code>, "Publikovano - aktivni", "Zelena"],
          ]}
        />
      </section>

      {/* V2 Lesson */}
      <section id="v2-lesson" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          LessonV2 (Lekce V2)
        </h3>
        <p className="text-gray-700 mb-4">
          Lekce obsahuje odkazy na bloky prostrednictvim BlockBinding.
          Poradi bloku je urceno vlastnosti <code>order</code>.
        </p>

        <CodeBlock
          code={`interface LessonV2 {
  lesson_id: string;              // Unikatni ID lekce
  version: number;                // Cislo verze lekce
  name: string;                   // Nazev lekce
  description: string;            // Popis lekce
  order: number;                  // Poradi v kurzu
  blocks: LessonBlockBinding[];   // Reference na bloky
}

interface LessonBlockBinding {
  block_id: string;               // ID bloku (reference)
  order: number;                  // Poradi v lekci
  bg_image?: string;              // Volitelny pozadi obrazek
  bg_color?: string;              // Volitelna barva pozadi
  default_practice: boolean;      // Automaticky pridat do procvicovani
}`}
        />

        <InfoBox type="tip">
          <code>default_practice: true</code> zpusobi, ze blok bude
          automaticky pridan do kolekce procvicovani studenta po prvnim
          zobrazeni.
        </InfoBox>
      </section>

      {/* V2 Block */}
      <section id="v2-block" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          BlockV2 (Blok V2)
        </h3>
        <p className="text-gray-700 mb-4">
          Blok je zakladni jednotka obsahu v V2 formatu. Kazdy blok obsahuje
          usporadane pole <code>steps[]</code> (kroky) a metadata pro didaktiku
          (GPF, FSRS, ucebni data).
        </p>

        <CodeBlock
          code={`interface BlockV2 {
  export_type: "block_v2";     // Identifikator formatu

  // Identifikace
  block_id: string;            // Unikatni ID bloku
  version: number;             // Cislo verze
  language: string;            // Jazyk obsahu
  author: string;              // Autor bloku
  updated: string;             // ISO timestamp
  status: BlockStatus;         // Stav bloku
  type: BlockType;             // "display" | "question" | "exercise"
  duration: string;            // Predpokladana delka ("5 min")
  xp?: number;                 // Body zkusenosti za dokonceni

  // Didaktika
  gpf: GPFData;                // GPF framework data
  learning: LearningMetadata;  // Ucebni metadata

  // Adaptace (volitelne)
  fsrs?: FSRSParameters;       // FSRS parametry
  adaptation?: AdaptationRules; // Pravidla adaptace

  // Kroky - usporadane pole obsahu
  steps?: BlockStep[];         // Kroky bloku (text, image, video, audio, question)

  // Block-level hint & help
  hint?: string;               // Napoveda (zobrazena na ? klik)
  help?: string;               // Podrobne vysvetleni
}

type BlockType = "display" | "question" | "exercise";`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Typy bloku (BlockType)
        </h4>
        <Table
          headers={["Hodnota", "Cesky", "Povolene kroky", "Chovani"]}
          rows={[
            [<code key="display">&quot;display&quot;</code>, "Zobrazeni", "text, image, video, audio", "Linearni: s1 → s2 → s3 → konec"],
            [<code key="question">&quot;question&quot;</code>, "Otazka", "text, image, video, audio, question", "Vetveni: odpovedi smeruji na ruzne kroky pomoci go_to"],
            [<code key="exercise">&quot;exercise&quot;</code>, "Procvicovani", "text, image, video, audio, question", "Vyhodnoceni spravne/nespravne, bez vetveni"],
          ]}
        />

        <InfoBox type="info">
          Kazdy blok je multi-step jednotka - muze obsahovat kombinaci textu,
          obrazku, videa a otazek v jednom bloku. Typ bloku urcuje, ktere typy
          kroku jsou povoleny a jak se chovaji odpovedi.
        </InfoBox>

        <InfoBox type="tip">
          <strong>Hint &amp; Help</strong> existuji na dvou urovnich: na urovni
          celeho bloku (globalni napoveda) a na urovni kazdeho kroku (specificka
          napoveda pro dany krok).
        </InfoBox>
      </section>

      {/* V2 Steps */}
      <section id="v2-steps" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          BlockStep (Krok)
        </h3>
        <p className="text-gray-700 mb-4">
          Krok je zakladni obsahova jednotka uvnitr bloku. Kazdy krok ma typ,
          poradove cislo a volitelne hint/help. Kroky jsou identifikovany
          sekvencnimi ID (<code>s1</code>, <code>s2</code>, <code>s3</code>...).
        </p>

        <CodeBlock
          code={`type StepType = "text" | "image" | "video" | "audio" | "question";

interface BlockStep {
  id: string;              // "s1", "s2", "s3"... (sekvencni)
  type: StepType;          // Typ kroku
  order: number;           // Poradi v bloku (1, 2, 3...)
  content?: string;        // Pro text kroky (Markdown/HTML)
  image?: StepImage;       // Pro image kroky
  video?: StepVideo;       // Pro video kroky (MP4 URL)
  audio?: StepAudio;       // Pro audio kroky (MP3/WAV URL)
  question?: QuestionConfig; // Pro question kroky
  hint?: string;           // Napoveda specificka pro tento krok
  help?: string;           // Podrobne vysvetleni pro tento krok
}

interface StepAudio {
  url: string;             // Primo audio URL (MP3, WAV, OGG)
}`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Typy kroku (StepType)
        </h4>
        <Table
          headers={["Typ", "Cesky", "Datove pole", "Popis"]}
          rows={[
            [<code key="text">&quot;text&quot;</code>, "Text", <code key="tc">content</code>, "Markdown nebo HTML textovy obsah"],
            [<code key="image">&quot;image&quot;</code>, "Obrazek", <code key="ic">image</code>, "Obrazek s URL, alt textem a pozici"],
            [<code key="video">&quot;video&quot;</code>, "Video", <code key="vc">video</code>, "Primo MP4 video s URL a pozici"],
            [<code key="audio">&quot;audio&quot;</code>, "Audio", <code key="ac">audio</code>, "Primo audio soubor (MP3, WAV, OGG)"],
            [<code key="question">&quot;question&quot;</code>, "Otazka", <code key="qc">question</code>, "Otazka s moznostmi, vyhodnocenim a zpetnou vazbou"],
          ]}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Video (StepVideo)
        </h4>
        <CodeBlock
          code={`interface StepVideo {
  url: string;             // Primo MP4 video URL
  position?: "above" | "below" | "inline";
}`}
        />
        <InfoBox type="warning">
          YouTube embedovani neni podporovano. Pouzivejte primo MP4 URL.
        </InfoBox>

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Prejmenovavani ID pri razeni
        </h4>
        <p className="text-gray-700 mb-4">
          Kdyz jsou kroky prerazeny (drag &amp; drop) nebo smazany, jejich ID se
          automaticky premenuje na sekvencni <code>s1</code>, <code>s2</code>,
          <code>s3</code>... a vsechny <code>go_to</code> reference v otazkach
          se aktualizuji na nove ID.
        </p>

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          go_to navigace (pouze question bloky)
        </h4>
        <p className="text-gray-700 mb-4">
          V blocich typu <code>question</code> muze kazda odpoved obsahovat
          pole <code>go_to</code>, ktere urcuje, kam student pokracuje:
        </p>
        <Table
          headers={["Hodnota", "Chovani"]}
          rows={[
            [<code key="next">NEXT_STEP</code>, "Pokracuj na nasledujici krok (vychozi)"],
            [<code key="again">AGAIN</code>, "Opakuj aktualni krok"],
            [<code key="end">END</code>, "Ukonci blok"],
            [<code key="sid">s1, s2, ...</code>, "Skoc na konkretni krok podle ID"],
          ]}
        />
        <InfoBox type="info">
          V blocich typu <code>exercise</code> se <code>go_to</code> nepouziva - kroky
          jsou vzdy linearni a odpovedi se pouze vyhodnocuji jako spravne/nespravne.
        </InfoBox>

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Priklad bloku s kroky
        </h4>
        <CodeBlock
          language="json"
          code={`{
  "type": "question",
  "steps": [
    {
      "id": "s1",
      "type": "text",
      "order": 1,
      "content": "<h2>Zlomky</h2><p>Zlomek je cast celku...</p>"
    },
    {
      "id": "s2",
      "type": "image",
      "order": 2,
      "image": {
        "url": "https://example.com/fractions.png",
        "alt": "Diagram zlomku",
        "position": "above"
      }
    },
    {
      "id": "s3",
      "type": "question",
      "order": 3,
      "question": {
        "type": "multiple_choice",
        "options": [
          { "id": "a", "text": "1/2", "is_correct": true, "go_to": "NEXT_STEP" },
          { "id": "b", "text": "1/3", "is_correct": false, "go_to": "s1" }
        ]
      },
      "hint": "Kolik casti z celku potrebujes?"
    }
  ],
  "hint": "Zamysli se nad zlomky.",
  "help": "Zlomek vyjadruje cast celku..."
}`}
        />
      </section>

      {/* V2 GPF */}
      <section id="v2-gpf" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          GPF Data (Global Proficiency Framework)
        </h3>
        <p className="text-gray-700 mb-4">
          GPF je mezinarodni ramec pro hodnoceni vzdelavani. Umoznuje
          mapovat obsah na globalni standardy.
        </p>

        <CodeBlock
          code={`interface GPFData {
  domain: string;           // Domena ("Number and operation", "Algebra", ...)
  construct: string;        // Konstrukt ("N2 FRACTIONS")
  subconstruct: string;     // Podkonstrukt ("N2.3 Solve real-world problems...")
  grade: number | null;     // Rocnik (1-10) nebo null
  level: GPFLevel;          // Uroven zvladnuti (1-4)
  vector?: number[];        // GPF taxonomy vektor
  kb_vector?: number[];     // Knowledge base vektor
  relation_vector?: number[]; // 35-element ELO relation vektor (0=none, 1=weak, 2=strong)
  elo_vector?: number[];      // 35-element ELO difficulty vektor (1.0–10.0)
}`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          GPF Level (Uroven zvladnuti)
        </h4>
        <Table
          headers={["Hodnota", "Anglicky", "Cesky", "Popis"]}
          rows={[
            ["1", "Below", "Pod urovni", "Student nedosahuje ocekavani"],
            ["2", "Partially meets", "Castecne splnuje", "Castecne zvladnuto"],
            ["3", "Meets", "Splnuje", "Splnuje ocekavani"],
            ["4", "Exceeds", "Prevysuje", "Prevysuje ocekavani"],
          ]}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Dostupne domeny
        </h4>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>
            <strong>Number and operation</strong> - Cisla a operace
          </li>
          <li>
            <strong>Algebra</strong> - Algebra
          </li>
          <li>
            <strong>Measurement</strong> - Mereni
          </li>
          <li>
            <strong>Geometry</strong> - Geometrie
          </li>
          <li>
            <strong>Statistics</strong> - Statistika
          </li>
        </ul>
      </section>

      {/* V2 Learning */}
      <section id="v2-learning" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Learning Metadata (Ucebni metadata)
        </h3>
        <p className="text-gray-700 mb-4">
          Metadata pro uceni zahrnuji koncepty, kompetence, Bloomovu
          taxonomii a prerekvizity.
        </p>

        <CodeBlock
          code={`interface LearningMetadata {
  concepts: string[];                    // Pojmy ["Zlomky", "Smisena cisla"]
  competencies: Record<string, number>;  // Kompetence { "M.4.5.7": 50 }
  bloom_level: BloomLevel;               // Bloomova uroven (1-6)
  difficulty: DifficultyLevel;           // Obtiznost (1-5)
  prerequisites: PrerequisiteRule[];     // Prerekvizity
  d_data?: Record<string, unknown>;      // R&D data (vyhledove)
  l_data?: Record<string, unknown>;      // FSRS/gamifikace signaly
}

interface PrerequisiteRule {
  block_id?: string;    // Pozadovany blok
  skill?: string;       // Pozadovana dovednost ("ALG_3.1.2")
  min_level: number;    // Minimalni uroven zvladnuti (0-1)
  weight?: number;      // Vaha v kalkulaci pripravenosti
}`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Bloomova taxonomie (bloom_level)
        </h4>
        <Table
          headers={["Hodnota", "Anglicky", "Cesky", "Priklad"]}
          rows={[
            [
              "1",
              "Remember",
              "Zapamatovat",
              "Vyjmenuj, definuj, opakuj",
            ],
            [
              "2",
              "Understand",
              "Porozumet",
              "Vysvetli, shrn, parafrazuj",
            ],
            ["3", "Apply", "Aplikovat", "Pouzij, vyres, demonstruj"],
            ["4", "Analyze", "Analyzovat", "Porovnej, rozlis, zkoumej"],
            ["5", "Evaluate", "Hodnotit", "Posud, obhaj, kritizuj"],
            ["6", "Create", "Tvorit", "Navrhni, vytvor, seskup"],
          ]}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Obtiznost (difficulty)
        </h4>
        <Table
          headers={["Hodnota", "Popis"]}
          rows={[
            ["1", "Velmi lehke"],
            ["2", "Lehke"],
            ["3", "Stredni"],
            ["4", "Tezke"],
            ["5", "Velmi tezke"],
          ]}
        />
      </section>

      {/* V2 FSRS */}
      <section id="v2-fsrs" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          FSRS Parametry (Free Spaced Repetition Scheduler)
        </h3>
        <p className="text-gray-700 mb-4">
          FSRS je algoritmus pro optimalni rozlozeni opakovani v case.
          Parametry ovlivnuji kdy a jak casto se blok zobrazi.
        </p>

        <CodeBlock
          code={`interface FSRSParameters {
  initial_difficulty: number;   // D0 - pocatecni obtiznost (default: 0.3)
  initial_stability: number;    // S0 - pocatecni stabilita (default: 2.5)
  initial_recall: number;       // R0 - pocatecni recall (default: 0.65)
  forgetting_rate: number;      // lambda - rychlost zapomeni (default: 0.25)
  repetitions: number;          // Pocet zobrazeni (default: 0)
  weight: number;               // Vaha bloku (default: 1.0)
  min_interval: number;         // Min. interval ve dnech (default: 1)
  max_interval: number;         // Max. interval ve dnech (default: 90)
  skip_condition?: string;      // Podminka preskoceni
  time_limit_sec?: number;      // Casovy limit v sekundach
}`}
        />

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          Vychozi hodnoty
        </h4>
        <CodeBlock
          code={`const DEFAULT_FSRS = {
  initial_difficulty: 0.3,   // 30% obtiznost
  initial_stability: 2.5,    // 2.5 dne stabilita
  initial_recall: 0.65,      // 65% sance na vybaveni
  forgetting_rate: 0.25,     // 25% zapomenuti za den
  repetitions: 0,            // Zatim nezobrazeno
  weight: 1.0,               // Standardni vaha
  min_interval: 1,           // Minimalne 1 den
  max_interval: 90,          // Maximalne 90 dni
};`}
        />

        <InfoBox type="info">
          <code>skip_condition</code> umoznuje preskocit blok na zaklade
          podminek, napr. <code>&quot;GPF_mastery &gt; 0.8&quot;</code> preskoci blok
          pokud student uz ma 80%+ zvladnuti.
        </InfoBox>
      </section>

      {/* V2 Adaptation Rules */}
      <section id="v2-adaptation" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          AdaptationRules (Adaptivni pravidla)
        </h3>
        <p className="text-gray-700 mb-4">
          Umoznuje podmineny scaffolding bloku. Podle vyrazu se rozhodne,
          zda se studentovi zobrazi plna verze, nebo podporna varianta s
          rozlozenymi kroky.
        </p>

        <CodeBlock
          code={`interface AdaptationRules {
  scaffolded?: string;  // Podminka pro scaffold verzi, napr. "avg_relevant_score < 3"
  full?: string;        // Podminka pro plnou verzi, napr. "avg_relevant_score >= 3"
}

// Pouziti na BlockV2:
{
  "block_id": "b1",
  "adaptation": {
    "scaffolded": "avg_relevant_score < 3",
    "full": "avg_relevant_score >= 3"
  }
}`}
        />

        <InfoBox type="tip">
          Pravidla se vyhodnocuji runtime proti signalum studenta. Pokud
          zadne nesouhlasi, pouzije se vychozi verze bloku.
        </InfoBox>
      </section>

      {/* V2 AI Mode */}
      <section id="v2-ai-mode" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          AIMode (AI-powered obsah)
        </h3>
        <p className="text-gray-700 mb-4">
          Konfigurace AI modelu pro generovani nebo hodnoceni obsahu v
          bloku. Muze byt pouzito na urovni kroku (generovane vysvetleni)
          nebo bloku (AI evaluace volne odpovedi).
        </p>

        <CodeBlock
          code={`interface AIMode {
  model: string;   // Identifikator modelu, napr. "gpt-4o-mini" nebo "claude-sonnet-4-6"
  prompt: string;  // System prompt pro generaci / evaluaci
}`}
        />
      </section>

      {/* V2 Evaluation Rules */}
      <section id="v2-evaluation" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          EvaluationRules (Validace odpovedi)
        </h3>
        <p className="text-gray-700 mb-4">
          Deklarativni pravidla pro vyhodnoceni odpovedi na otazku. Podporuje
          presnou shodu, obsahovou shodu, regex i ciselny rozsah.
        </p>

        <CodeBlock
          code={`type EvaluationType = "exact_match" | "contains" | "regex" | "numeric_range";

interface EvaluationRules {
  type: EvaluationType;
  accepted_answers?: string[];  // exact_match / contains
  pattern?: string;             // regex
  min?: number;                 // numeric_range
  max?: number;                 // numeric_range
}`}
        />

        <Table
          headers={["type", "Pouzita pole", "Popis"]}
          rows={[
            [
              "exact_match",
              "accepted_answers",
              "Odpoved musi presne odpovidat nekterymu prvku",
            ],
            [
              "contains",
              "accepted_answers",
              "Odpoved musi obsahovat nektery z retezcu",
            ],
            ["regex", "pattern", "Odpoved musi odpovidat regularnimu vyrazu"],
            ["numeric_range", "min, max", "Ciselna odpoved v intervalu <min, max>"],
          ]}
        />
      </section>

      {/* V2 Analytics Event */}
      <section id="v2-analytics" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          AnalyticsEvent (Telemetrie bloku)
        </h3>
        <p className="text-gray-700 mb-4">
          Struktura pro tracking interakce studenta s blokem. Zachycuje
          casovou osu, pouziti pomocnych nastroju a volny feedback.
        </p>

        <CodeBlock
          code={`interface AnalyticsEvent {
  timestamp_start: string;     // ISO 8601, kdy student blok otevrel
  timestamp_answer?: string;   // ISO 8601, kdy odeslal odpoved
  timestamp_leave: string;     // ISO 8601, kdy blok opustil
  delta_sec?: number;          // Cas mezi otazkou a odpovedi (s)
  time_spent?: number;         // Celkovy cas v bloku (s)
  used_help?: 1 | 2 | 3;       // 1 = hint, 2 = help, 3 = AI
  user_feedback?: string;      // Volny textovy feedback
}`}
        />

        <InfoBox type="info">
          Pole je aktualne &quot;future ready&quot; — datovy model je pripraven,
          ale ne vsechny klienti ho zatim emituji.
        </InfoBox>
      </section>

      {/* V2 Type Guards */}
      <section id="v2-guards" className="scroll-mt-20">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Type Guards (Rozpoznani formatu)
        </h3>
        <p className="text-gray-700 mb-4">
          Runtime kontroly pro bezpecne rozpoznani typu importovaneho JSONu.
          Exportovane z <code>src/types/block-v2.ts</code>.
        </p>

        <CodeBlock
          code={`// Jakykoliv V2 package (course, exercise, quiz)
function isV2Package(data: unknown): data is CourseV2

// Konkretne course_v2
function isCourseV2(data: unknown): data is CourseV2

// quiz_v2
function isQuizV2(data: unknown): data is CourseV2

// exercise_v2
function isExerciseV2(data: unknown): data is CourseV2

// Samostatny block_v2 (export_type === "block_v2")
function isBlockV2(data: unknown): data is BlockV2

// Legacy format bez export_type, detekovany pres block_id
function isLegacyV2Block(data: unknown): data is BlockV2`}
        />

        <InfoBox type="tip">
          Pri importu vzdy pouzij <code>isV2Package()</code> nejdriv — pokud
          vrati <code>false</code>, jde o V1 nebo neplatny format.
        </InfoBox>
      </section>
    </>
  );
}
