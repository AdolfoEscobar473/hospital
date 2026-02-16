function resolveCell(row, column) {
  if (typeof column.render === "function") {
    return column.render(row);
  }
  if (column.accessor) return row[column.accessor];
  return "";
}

export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyText = "Sin datos",
  className = "",
}) {
  return (
    <div className={`data-table-wrap ${className}`.trim()}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key || column.label}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="table-state table-loading">
                <div className="table-spinner" />
                <span>Cargando...</span>
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr key={row.id || JSON.stringify(row)}>
                {columns.map((column) => (
                  <td key={column.key || column.label}>{resolveCell(row, column) ?? "-"}</td>
                ))}
              </tr>
            ))}
          {!loading && !rows.length && (
            <tr>
              <td colSpan={columns.length} className="table-state">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
