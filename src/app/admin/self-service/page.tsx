import { SelfServiceClassroomList } from "@/components/admin/SelfServiceClassroomList";

export default function SelfServicePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Samoobsluha</h1>
        <p className="text-gray-600 mt-1">
          Třídy, které si samy založily děti po potvrzení souhlasu rodiče — nejsou to
          školní třídy a nemají učitele.
        </p>
      </div>

      <SelfServiceClassroomList />
    </div>
  );
}
