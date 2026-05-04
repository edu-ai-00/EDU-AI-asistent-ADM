export function Changelog() {
  return (
    <section id="changelog" className="scroll-mt-20">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Changelog</h2>

      <div className="space-y-8">
        {/* 0.3.1 */}
        <div className="bg-white p-6 rounded-lg border-2 border-green-200">
          <h3 className="text-xl font-semibold text-green-700 mb-4">
            [0.3.1] - 2026-04-13
          </h3>

          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Dokumentace</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Doplneno <code>relation_vector</code> a <code>elo_vector</code> v sekci GPF Data (35-element ELO vektory)</li>
            <li>Nove sekce: <strong>AdaptationRules</strong>, <strong>AIMode</strong>, <strong>EvaluationRules</strong>, <strong>AnalyticsEvent</strong>, <strong>Type Guards</strong></li>
            <li>Design tokens HTML: doplneny barvy <code>progressBorder</code>, <code>hintBorder</code>, <code>hintIconColor</code>, <code>hintIcon</code>, <code>successBgLight</code>, <code>videoDark</code></li>
            <li>Design tokens HTML: doplneny text styly <code>statValueAlt</code> a <code>navLabel</code></li>
          </ul>

        </div>

        {/* 0.3.0 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            [0.3.0] - 2026-02-13
          </h3>

          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Pridano</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Novy typ kroku <code>audio</code> — prehravac zvuku s URL vstupem a <code>&lt;audio&gt;</code> nahledem</li>
            <li>Novy typ otazky <code>numeric</code> — ciselna odpoved s toleranci (±) a automatickym zobrazenim rozsahu</li>
            <li>Pole <code>only_once</code> na CourseV2 — jednorazovy kurz, student se nemuze vratit po dokonceni</li>
          </ul>

        </div>

        {/* 0.2.0 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-green-700 mb-4">
            [0.2.0] - 2026-02-12
          </h3>

          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Pridano</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Multi-step architektura bloku - kazdy blok obsahuje <code>steps[]</code> pole</li>
            <li>Novy typ bloku <code>exercise</code> (procvicovani) vedle <code>display</code> a <code>question</code></li>
            <li>5 typu kroku: <code>text</code>, <code>image</code>, <code>video</code>, <code>audio</code>, <code>question</code></li>
            <li>Hint a Help na urovni kazdeho kroku i celeho bloku</li>
            <li><code>go_to</code> navigace v question blocich - vetveni na zaklade odpovedi (NEXT_STEP, AGAIN, END, step ID)</li>
            <li>Tab &quot;Flow&quot; v editoru - vizualizace propojeni kroku</li>
            <li>Drag &amp; drop razeni kroku s automatickym prejmenovavanim (s1, s2, ...)</li>
            <li>Automaticka migrace starych flat bloku na kroky pri importu</li>
            <li>Tlacitko &quot;+ Step&quot; v zahlavi tabu pro rychle pridani kroku</li>
          </ul>

          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Zmeneno</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Video podpora zmenena z YouTube iframe na primo MP4 (<code>&lt;video&gt;</code> element)</li>
            <li>Block editor prepsan na step-based editaci - tab &quot;Steps&quot; nahradi puvodni &quot;Content&quot;/&quot;Question&quot;</li>
            <li>Validace exportu prepsana pro validaci kroku</li>
            <li>Strom kurzu zobrazuje ikony a nahled z kroku</li>
            <li>Admin results stranka zobrazuje typ exercise a cte obsah z kroku</li>
          </ul>

          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Odstraneno</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>YouTube embed podpora (nelze embedovat, prechod na MP4)</li>
            <li>Puvodni <code>DisplayContentEditor</code> a <code>QuestionBlockEditor</code> komponenty</li>
          </ul>
        </div>

        {/* 0.1.5 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            [0.1.5] - 2026-01-21
          </h3>

          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Zmeneno</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Odstraneny Export Type selector - kurzy nyni pouzivaji pouze <code>course_v2</code></li>
            <li>Vylepsena sprava lekci - drag &amp; drop pro razeni lekci</li>
            <li>Block Editor layout - sekce Steps presunuta pod Identification</li>
            <li>Citelnost leve navigace - dvouradkovy layout bloku s vetsim fontem</li>
            <li>Zjednodusene typy kroku - pouze <code>display</code> a <code>evaluation</code></li>
          </ul>

          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Pridano</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Drag &amp; drop pro lekce v Course V2 Editoru</li>
            <li>Drag &amp; drop pro bloky - presun mezi lekcemi</li>
            <li>Vizualni zpetna vazba pri pretahovani</li>
          </ul>

          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Odstraneno</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Typy kroku <code>display_task</code>, <code>display_solution</code>, <code>hint</code></li>
          </ul>
        </div>

        {/* 0.1.4 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            [0.1.4] - 2026-01-21
          </h3>
          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Pridano</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Validacni system bloku s omezenim typu kroku</li>
            <li>Quiz mode export (<code>quiz_v2</code>) - bez napovedy</li>
            <li>Exercise mode export (<code>exercise_v2</code>) - s napovedou</li>
            <li>Konfigurace otazek (multiple choice, true/false, open)</li>
          </ul>
        </div>

        {/* 0.1.3 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            [0.1.3] - 2026-01-20
          </h3>
          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Pridano</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Podpora header obrazku pro kurzy a lekce</li>
            <li>Sprava export typu v Course V2 Editoru</li>
            <li>Nahled obrazku v editorech</li>
          </ul>
        </div>

        {/* 0.1.2 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            [0.1.2] - 2026-01-19
          </h3>
          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Zmeneno</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Refaktoring kodu pro lepsi citelnost</li>
            <li>Aktualizace Next.js a zavislosti</li>
          </ul>
        </div>

        {/* 0.1.1 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            [0.1.1] - 2026-01-18
          </h3>
          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Pridano</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Course V2 Editor s plnou podporou GPF</li>
            <li>Lesson V2 Editor s block bindings</li>
            <li>Block V2 Editor s FSRS parametry</li>
            <li>Step editor s vice mody (static, AI)</li>
          </ul>
        </div>

        {/* 0.1.0 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            [0.1.0] - 2026-01-17
          </h3>
          <h4 className="font-semibold text-gray-700 mt-4 mb-2">Pridano</h4>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Prvni vydani</li>
            <li>Navigace stromem kurzu (V1 a V2 formaty)</li>
            <li>Import/export souboru (JSON)</li>
            <li>Zakladni editory pro kurzy, lekce a kroky</li>
            <li>Podpora GPF (Global Proficiency Framework)</li>
            <li>FSRS parametry (Free Spaced Repetition Scheduler)</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
