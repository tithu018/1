"use client";
import { useState } from "react";

export function DataTable({ headers, rows, exportName }: { headers: string[]; rows: string[][]; exportName?: string }) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase()));
  function download() {
    const csv = [headers, ...filtered].map((row) => row.map((cell) => `"${(/^[=+@-]/.test(cell) ? "'" : "") + cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${exportName ?? "records"}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <><div style={{ display: "flex", gap: 12, marginBottom: 16 }}><input aria-label="Search records" placeholder="Search records" value={query} onChange={(event) => setQuery(event.target.value)} />{exportName && <button type="button" onClick={download}>Export CSV</button>}</div><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{filtered.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table>{!filtered.length && <p>No matching records.</p>}</>;
}
