"use client";

import lodash from "lodash";
import { useReducer } from "react";
import { match } from "ts-pattern";

import { distinct } from "~/utils/utils";

import { Button } from "./ui/button";
import { ComboboxDemo } from "./ui/combobox";
import { FullChunkSelectorData } from "~/types";

export type SelectorData = {
  region: string;
  document: string | null;
  title: string | null;
  chunk: string | null;
  chunkId: string | null;
};

const createChunkId = (chunk: SelectorData) => {
  if (!chunk.document || !chunk.title || !chunk.chunk) {
    return chunk.chunkId;
  }

  const baseString = `${chunk.document} - ${chunk.title} - ${chunk.chunk}`;

  if (chunk.region !== "nacional") {
    return `(${chunk.region.toLocaleUpperCase()}) ${baseString}`;
  }

  return baseString;
};

export default function ChunkSelector({
  regions,
  chunkSelectorData,
  selectedChunks,
  setSelectedChunks,
}: {
  regions: string[];
  chunkSelectorData: FullChunkSelectorData;
  selectedChunks: SelectorData[];
  setSelectedChunks: (value: SelectorData[]) => void;
}) {
  const [documentData, dispatch] = useReducer<
    (state: SelectorData, action: Partial<SelectorData>) => SelectorData
  >(
    (state, action) => ({
      ...state,
      ...action,
    }),
    {
      region: "nacional",
      document: null,
      title: null,
      chunk: null,
      chunkId: null,
    },
  );

  const getBySelection = (type: "Documento" | "Parte" | "Chunk") => {
    if (!documentData.region) return [];

    return match(type)
      .with("Documento", () => {
        return Object.keys(chunkSelectorData[documentData.region] ?? {});
      })
      .with("Parte", () => {
        return (
          (documentData.document &&
            chunkSelectorData?.[documentData.region]?.[documentData.document] &&
            Object.keys(
              chunkSelectorData[documentData.region][documentData.document],
            )) ||
          []
        );
      })
      .with("Chunk", () => {
        return (
          (documentData.document &&
            documentData.title &&
            chunkSelectorData[documentData.region]?.[documentData.document][
              documentData.title
            ].chunks.map((x) => x.chunk)) ||
          []
        );
      })
      .run();
  };

  const orderArticles = (articles: string[]) => {
    return articles.sort((a, b) => {
      const aNumber = parseInt(a.replace("Artículo ", ""));
      const bNumber = parseInt(b.replace("Artículo ", ""));

      if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) {
        return aNumber - bNumber;
      }
      return Number.isNaN(aNumber) ? 1 : -1;
    });
  };

  const uniqueChunks = lodash.uniqBy(selectedChunks, "chunkId");

  return (
    <div className="flex w-full flex-col justify-between gap-y-5">
      {uniqueChunks.length > 0 ? (
        <div className="grid grid-cols-1 gap-y-2 rounded-lg border p-2">
          {uniqueChunks.map((chunk) => (
            <div
              className="flex w-full items-center justify-between"
              key={chunk.chunkId}
            >
              <Button
                variant={"outline"}
                size={"sm"}
                onClick={() => {
                  setSelectedChunks(selectedChunks.filter((x) => x !== chunk));
                }}
              >
                -
              </Button>
              <div>
                <span className="text-sm">{createChunkId(chunk)}</span>
              </div>
              <div></div>
            </div>
          ))}
        </div>
      ) : (
        <div></div>
      )}
      <div className="grid grid-cols-1 gap-y-2">
        <div className="grid auto-cols-auto grid-flow-col gap-x-4">
          <ComboboxDemo
            placeholder="Región"
            value={documentData.region}
            values={regions}
            setValue={(value) =>
              dispatch({
                region: value,
                document: null,
                title: null,
                chunk: null,
              })
            }
          />
          <ComboboxDemo
            placeholder="Documento"
            value={documentData.document ?? ""}
            values={getBySelection("Documento")}
            setValue={(value) =>
              dispatch({ document: value, title: null, chunk: null })
            }
          />
          <ComboboxDemo
            placeholder="Parte"
            value={documentData.title ?? ""}
            values={orderArticles(getBySelection("Parte"))}
            setValue={(value) => {
              if (documentData.document) {
                const chunk =
                  chunkSelectorData[documentData.region][documentData.document][
                    value
                  ];

                if (chunk.chunks.length === 1) {
                  dispatch({ title: value, chunk: chunk.chunks[0].chunk });
                  return;
                }
              }

              dispatch({ title: value, chunk: null });
            }}
          />

          {documentData.document &&
            documentData.title &&
            chunkSelectorData[documentData.region]?.[documentData.document][
              documentData.title
            ].chunks.length > 1 && (
              <ComboboxDemo
                placeholder="Chunk"
                value={documentData.chunk ?? ""}
                values={distinct(getBySelection("Chunk"))}
                setValue={(value) => dispatch({ chunk: value })}
                texts={
                  (documentData.document &&
                    documentData.title &&
                    chunkSelectorData[documentData.region]?.[
                      documentData.document
                    ][documentData.title].chunks.map((x) => ({
                      chunk_id: x.id,
                      text: x.text,
                    }))) ||
                  []
                }
              />
            )}
        </div>

        <Button
          variant="outline"
          onClick={() => {
            if (
              !documentData.document ||
              !documentData.title ||
              !documentData.chunk
            )
              return alert("Faltan datos");

            const chunkId = chunkSelectorData[documentData.region][
              documentData.document
            ][documentData.title].chunks.find(
              (x) => x.chunk === documentData.chunk,
            )?.id;

            const item = {
              ...documentData,
              chunkId: chunkId ?? null,
            };

            if (
              selectedChunks.some(
                (x) =>
                  x.chunk === item.chunk &&
                  x.document === item.document &&
                  x.title === item.title,
              )
            ) {
              return alert(
                "Ya has seleccionado este chunk, no puede estar dos veces",
              );
            }

            setSelectedChunks([...selectedChunks, item]);
          }}
        >
          +
        </Button>
      </div>
    </div>
  );
}
