"use client";

import { useSearchParams } from "@remix-run/react";
import { Button } from "./ui/button";

export default function Paginator() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activePage = Number(searchParams?.get("page") ?? 1);

  const goToPage = (page: number) => {
    page === 0
      ? searchParams.delete("page")
      : searchParams.set("page", String(page));
    setSearchParams(searchParams);
  };

  return (
    <div className="flex w-full justify-center space-x-2">
      {activePage > 0 ? (
        <Button variant="outline" onClick={() => goToPage(activePage - 1)}>
          Página anterior
        </Button>
      ) : null}
      <Button variant="outline" onClick={() => goToPage(activePage + 1)}>
        Siguiente página
      </Button>
    </div>
  );
}
