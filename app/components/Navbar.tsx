"use client";

import { XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { prettifyName } from "~/utils/utils";

import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useSearchParams } from "@remix-run/react";

export function Navbar({
  messageTypes,
  lastIdSeen,
}: {
  messageTypes: string[];
  lastIdSeen: {
    questions: number;
    cacheGroups: number;
  };
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [lastIdsSeen, setLastIdsSeen] = useState<{
    questions: number;
    cacheGroups: number;
  }>({
    questions: 0,
    cacheGroups: 0,
  });

  const handleUpdateParams = (params: Record<string, string>) => {
    setSearchParams((searchParams) => {
      const newParams = new URLSearchParams(
        Object.fromEntries([
          ...(searchParams ? searchParams.entries() : []),
          ...Object.entries(params),
        ]),
      ).toString();

      return newParams;
    });
  };

  useEffect(() => {
    const lastIds = JSON.parse(localStorage.getItem("lastIdSeen") ?? "{}");

    setLastIdsSeen(lastIds);

    return () => {
      localStorage.setItem("lastIdSeen", JSON.stringify(lastIdSeen));
    };
  }, [lastIdSeen]);

  const inputSearchRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="flex items-center space-x-4">
        <div>
          <Select
            defaultValue={searchParams?.get("showing") ?? "all"}
            onValueChange={(value) => {
              handleUpdateParams({ showing: value });
            }}
          >
            <SelectTrigger
              id="cache/showing"
              defaultValue={"infantil"}
              className="capitalize"
            >
              <SelectValue placeholder="Cached/Not" className="capitalize" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem
                key={"all"}
                value={"all"}
                className="cursor-pointer capitalize"
              >
                All
              </SelectItem>
              <SelectItem
                key={"cached"}
                value={"cached"}
                className="cursor-pointer capitalize"
              >
                Cached
              </SelectItem>
              <SelectItem
                key={"non-cached"}
                value={"non-cached"}
                className="cursor-pointer capitalize"
              >
                Non-cached
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            defaultValue={searchParams?.get("questionType") ?? "all"}
            onValueChange={(value) => {
              handleUpdateParams({ questionType: value });
            }}
          >
            <SelectTrigger
              id="cache/showing"
              defaultValue={"infantil"}
              className="capitalize"
            >
              <SelectValue
                placeholder="Legislativas o no"
                className="capitalize"
              />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem
                key={"all"}
                value={"all"}
                className="cursor-pointer capitalize"
              >
                All
              </SelectItem>
              <SelectItem
                key={"legislativas"}
                value={"legislativas"}
                className="cursor-pointer capitalize"
              >
                Legislativas
              </SelectItem>
              <SelectItem
                key={"no-legislativas"}
                value={"no-legislativas"}
                className="cursor-pointer capitalize"
              >
                No legislativas
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-x-5">
        <div className="flex flex-col space-y-1 text-xs font-light">
          <p>La ultima pregunta que viste es: {lastIdsSeen?.questions ?? 0}</p>
          <p>
            El ultimo grupo de cache que viste es:{" "}
            {lastIdsSeen?.cacheGroups ?? 0}
          </p>
        </div>

        <div>
          <Select
            defaultValue={searchParams?.get("messageType") ?? "qa"}
            onValueChange={(val) =>
              handleUpdateParams({
                messageType: val,
              })
            }
          >
            <SelectTrigger id="messageType" defaultValue={"qa"}>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent position="popper">
              {messageTypes?.map((messageType) => (
                <SelectItem
                  value={messageType}
                  className="cursor-pointer"
                  key={messageType}
                >
                  {prettifyName(messageType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Input
            id="search"
            placeholder="Buscar pregunta"
            type="text"
            className="w-[30rem] pr-8"
            ref={inputSearchRef}
            defaultValue={searchParams?.get("search")?.toString() ?? ""}
            onChange={(e) => {
              handleUpdateParams({
                search: e.target.value,
              });
            }}
          />

          <div className="absolute bottom-0 right-2 top-0 flex h-full flex-col justify-center">
            <XIcon
              className="h-5 w-5 cursor-pointer rounded-lg text-gray-400 hover:bg-slate-100"
              onClick={() => {
                if (inputSearchRef.current) {
                  inputSearchRef.current.value = "";
                }

                handleUpdateParams({
                  search: "",
                });
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
