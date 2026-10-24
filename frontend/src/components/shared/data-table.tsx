"use client";

import { useMemo, type ReactNode } from "react";
import {
  flexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pageCount } from "@/lib/api/pagination";

export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;

export function DataTable<T extends object>({
  data,
  columns,
  count,
  pageIndex,
  pageSize,
  sorting,
  onPageChange,
  onSortingChange,
  caption,
  empty,
}: {
  data: T[];
  // TanStack Table's value generic is invariant, so one table mixes column value types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<DataTableFeatures, T, any>[];
  count: number;
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  onPageChange: (pageIndex: number) => void;
  onSortingChange: (sorting: SortingState) => void;
  caption: string;
  empty?: ReactNode;
}) {
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  );
  const table = useTable({
    features: dataTableFeatures,
    columns: columns as unknown as ColumnDef<DataTableFeatures, RowData, unknown>[],
    data: data as unknown as RowData[],
    manualPagination: true,
    manualSorting: true,
    rowCount: count,
    enableMultiSort: false,
    state: { pagination, sorting },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      onPageChange(next.pageIndex);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
  });
  const pages = pageCount(count, pageSize);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const toggle = header.column.getToggleSortingHandler();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : toggle && header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left"
                          onClick={toggle}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ) : (
                            <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden />
                          )}
                          <span className="sr-only">
                            {sorted === "asc" ? ", sorted ascending" : sorted === "desc" ? ", sorted descending" : ", not sorted"}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">
                  {empty ?? "No results."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
        <p>
          {count === 0 ? "0 results" : `${pageIndex * pageSize + 1}–${Math.min(count, (pageIndex + 1) * pageSize)} of ${count}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex <= 0}
          >
            Previous
          </Button>
          <span>
            Page {pageIndex + 1} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex + 1 >= pages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { ColumnDef, SortingState };
