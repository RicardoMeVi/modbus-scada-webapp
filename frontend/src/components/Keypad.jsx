import "./Keypad.css";

// Teclado numérico estilo HMI industrial (mismo layout que la Unidad de
// Verificación del panel Kinco/ICH físico): 1-9, borrar todo, borrar uno,
// signo, punto decimal y Enter.
const FILAS = [
  [{ v: "1" }, { v: "2" }, { v: "3" }, { v: "CLR", clase: "key-clr" }],
  [{ v: "4" }, { v: "5" }, { v: "6" }, { v: "←" }],
  [{ v: "7" }, { v: "8" }, { v: "9" }, { v: "-" }],
  [{ v: "0" }, { v: "." }, { v: "ENTER", clase: "key-enter", span: true }],
];

export function Keypad({ onKey, disabled = false }) {
  return (
    <div className="keypad">
      {FILAS.flat().map((tecla) => (
        <button
          key={tecla.v}
          type="button"
          className={`key ${tecla.clase ?? ""}`}
          disabled={disabled}
          onClick={() => onKey(tecla.v)}
        >
          {tecla.v}
        </button>
      ))}
    </div>
  );
}
