export interface PickableMember {
  id: string;
  fullName: string;
}

interface MemberPickerProps {
  legend: string;
  members: PickableMember[];
  selectedIds: string[];
  disabled?: boolean;
  onChange: (selectedIds: string[]) => void;
}

// Lista de casillas para elegir miembros (responsables, coordinadores, integrantes).
export function MemberPicker({
  legend,
  members,
  selectedIds,
  disabled = false,
  onChange,
}: MemberPickerProps): React.JSX.Element {
  function toggle(id: string): void {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <fieldset className="picker">
      <legend>{legend}</legend>
      {members.length === 0 && <p className="status">No hay miembros activos.</p>}
      {members.map((member) => (
        <label key={member.id} className="picker__option">
          <input
            type="checkbox"
            checked={selectedIds.includes(member.id)}
            disabled={disabled}
            onChange={() => {
              toggle(member.id);
            }}
          />
          {member.fullName}
        </label>
      ))}
    </fieldset>
  );
}
