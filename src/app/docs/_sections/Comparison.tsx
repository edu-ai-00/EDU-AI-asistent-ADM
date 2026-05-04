import { InfoBox, Table } from "../_components/atoms";

export function Comparison() {
  return (
    <section id="comparison" className="scroll-mt-20">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        Srovnani V1 vs V2
      </h2>

      <Table
        headers={["Vlastnost", "V1 (Legacy)", "V2 (Doporuceny)"]}
        rows={[
          ["Hierarchie", "Course → Lectures → Steps", "Course → Lessons → Blocks → Steps"],
          ["Znovupouzitelnost bloku", "Ne", "Ano"],
          ["Multi-step bloky", "Ne", "Ano (steps[] s text, image, video, audio, question)"],
          ["GPF Framework", "Ne", "Ano"],
          ["FSRS (Spaced Repetition)", "Ne", "Ano"],
          [
            "Typy bloku",
            "text, image",
            "display, question, exercise",
          ],
          [
            "Ucebni metadata",
            "Zakladni",
            "Kompletni (Bloom, kompetence, prerekvizity)",
          ],
          ["Status tracking", "Ne", "Ano (draft, locked, approved, published)"],
          ["Verzovani", "Ne", "Ano (cislo verze, timestamp)"],
          [
            "Typy otazek",
            "Pouze odpoved",
            "open, multiple_choice, true_false, numeric",
          ],
          ["Vetveni (go_to)", "following_action", "go_to na urovni kroku (NEXT_STEP, AGAIN, END, step ID)"],
          ["Zpetna vazba", "Ne", "Ano (feedback, solution, hint, help na urovni kroku i bloku)"],
          ["Video", "Ne", "Ano (primo MP4)"],
        ]}
      />

      <InfoBox type="warning">
        V1 format je udrzonam pouze pro zpetnou kompatibilitu. Pro nove
        projekty vzdy pouzivejte V2 format.
      </InfoBox>
    </section>
  );
}
