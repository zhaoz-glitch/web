import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { getDbTableData, getDbTables, type DbTableMeta } from "~/lib/api";
import { useAuth } from "~/lib/auth";

const PAGE_SIZE = 20;

/**
 * DB Workbench — 数据表浏览器。
 *
 * 左侧为数据库中的全部表（含行数），右侧展示选中表的字段定义
 * 与分页数据。所有数据来自后端的原生 SQL 查询接口。
 */
export default function DbWorkbench() {
  const { user, logout } = useAuth();

  const [tables, setTables] = useState<DbTableMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMeta, setColumnMeta] = useState<DbTableMeta["columns"]>([]);
  const [rows, setRows] = useState<Record<string, string | null>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the table list once
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDbTables()
      .then((res) => {
        if (cancelled) return;
        setTables(res.tables);
        if (res.tables.length > 0) setSelected(res.tables[0].name);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load data whenever the selected table or page changes
  const loadTable = useCallback(
    (tableName: string, pageOffset: number) => {
      setDataLoading(true);
      setError(null);
      getDbTableData(tableName, PAGE_SIZE, pageOffset)
        .then((res) => {
          setColumns(res.columns);
          setRows(res.rows);
          setTotal(res.total);
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setDataLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (!selected) return;
    setOffset(0);
    loadTable(selected, 0);
  }, [selected, loadTable]);

  const meta = tables.find((t) => t.name === selected);
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 dark:bg-emerald-500">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  数据表 Workbench
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  SQLite · low_carbon_screener.db
                </p>
              </div>
              <Link
                to="/"
                className="ml-4 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                ← 返回筛选器
              </Link>
            </div>
            <div className="flex items-center gap-2 border-l border-gray-200 pl-4 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {user?.name}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent dark:border-emerald-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
            {/* Table list sidebar */}
            <aside className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                数据表 ({tables.length})
              </h2>
              <ul className="space-y-1">
                {tables.map((t) => (
                  <li key={t.name}>
                    <button
                      type="button"
                      onClick={() => setSelected(t.name)}
                      className={
                        selected === t.name
                          ? "flex w-full items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      }
                    >
                      <span className="font-mono">{t.name}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {t.row_count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            {/* Table detail */}
            <section className="space-y-4">
              {/* Column metadata */}
              {meta && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <span className="font-mono">{meta.name}</span>{" "}
                    字段定义 ({meta.columns.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                          <th className="py-2 pr-4 font-medium">字段名</th>
                          <th className="py-2 pr-4 font-medium">类型</th>
                          <th className="py-2 pr-4 font-medium">非空</th>
                          <th className="py-2 pr-4 font-medium">主键</th>
                          <th className="py-2 font-medium">默认值</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {meta.columns.map((c) => (
                          <tr key={c.name} className="text-gray-700 dark:text-gray-300">
                            <td className="py-2 pr-4 font-mono">{c.name}</td>
                            <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">
                              {c.type || "—"}
                            </td>
                            <td className="py-2 pr-4">{c.notnull ? "√" : ""}</td>
                            <td className="py-2 pr-4">{c.pk ? "√" : ""}</td>
                            <td className="py-2 text-gray-500 dark:text-gray-400">
                              {c.default ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Row data */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    数据 ({total} 行)
                  </h2>
                  {dataLoading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent dark:border-emerald-400" />
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        {columns.map((c) => (
                          <th key={c} className="whitespace-nowrap py-2 pr-4 font-medium font-mono">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rows.map((row, i) => (
                        <tr key={i} className="text-gray-700 dark:text-gray-300">
                          {columns.map((c) => (
                            <td
                              key={c}
                              className="max-w-[220px] truncate whitespace-nowrap py-2 pr-4 font-mono"
                              title={row[c] ?? ""}
                            >
                              {row[c] ?? <span className="text-gray-400 dark:text-gray-600">NULL</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {rows.length === 0 && !dataLoading && (
                        <tr>
                          <td
                            colSpan={columns.length || 1}
                            className="py-8 text-center text-gray-400 dark:text-gray-500"
                          >
                            空表
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    第 {page} / {totalPages} 页 · 共 {total} 行
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={offset === 0 || dataLoading}
                      onClick={() => {
                        const next = Math.max(offset - PAGE_SIZE, 0);
                        setOffset(next);
                        if (selected) loadTable(selected, next);
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      disabled={offset + PAGE_SIZE >= total || dataLoading}
                      onClick={() => {
                        const next = offset + PAGE_SIZE;
                        setOffset(next);
                        if (selected) loadTable(selected, next);
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
