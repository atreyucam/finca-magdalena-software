import EstadoVacio from '../../../components/ui/EstadoVacio';


export default function InventarioResumenPanel({ titulo }) {
 return (
    <EstadoVacio>
      <div className="space-y-2">
        <div className="text-base font-semibold text-slate-800">{titulo}</div>
        <div className="text-sm text-slate-500">
          Esta sección está en construcción. Próximamente tendrá filtros propios y su reporte.
        </div>
      </div>
    </EstadoVacio>
  );
}

