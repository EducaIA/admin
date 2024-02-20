
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";

import { distinct, getPrettyTime } from "~/utils/utils";
import { CacheGroup, UserQuestion } from "~/server/db";
import { FullChunkSelectorData } from "~/types";

import ChunkSelector, { type SelectorData } from "./ChunkSelector";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import MultipleSelector from "./ui/multiple-selector";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Form, useFetcher } from "@remix-run/react";
import { toast } from "sonner";

const Responses = ({ responses }: { responses: Record<string, string> }) => {
  const responseKeys = Object.keys(responses);

  return (
    <div className="flex w-full flex-col gap-y-3">
      {responseKeys.length === 0 ? (
        <div key={responses.nacional} className="w-full">
          <Label htmlFor="respuesta-nacional" className="ml-1 capitalize">
            Nacional
          </Label>
          <Textarea
            className="read-only:bg-grey-100"
            id="respuesta-nacional"
            name="respuesta-nacional"
            value={responses.nacional}
            rows={Math.min(responses.nacional.split("\n").length, 10)}
          />
        </div>
      ) : (
        responseKeys.map((region) => (
          <div key={responses[region]} className="w-full">
            <Label htmlFor={`respuesta-${region}`} className="ml-1 capitalize">
              {region}
            </Label>
            <Textarea
              className="read-only:bg-grey-100"
              id={`respuesta-${region}`}
              name={`respuesta-${region}`}
              defaultValue={responses[region]}
              rows={Math.min(responses[region].split("\n").length, 10)}
            />
          </div>
        ))
      )}
    </div>
  );
};

export function QuestionCard({
  initialData,
  regions,
  questions,
  topics,
  chunkSelectorData,
}: {
  initialData: UserQuestion | CacheGroup;
  regions: string[];
  questions?: string[];
  topics: { value: string; label: string }[];
  chunkSelectorData: FullChunkSelectorData;
}) {
  const [question, setQuestion] = useState<string>(initialData?.question ?? "");

  const [generatedResponses, setGeneratedResponses] = useState<
    Record<string, string>
  >(() => {
    if (initialData?.type === "cached") {
      return (initialData as CacheGroup).answer || {};
    }

    const slug = (initialData as UserQuestion)?.oposicion_slug ?? "nacional";
    const answers = { [slug]: (initialData as UserQuestion)?.response ?? "" };

    return answers;
  });

  const responseFetcher = useFetcher<
    | {
        success: true;
        response: Record<string, string>;
      }
    | {
        success: false;
        error: Record<string, string>;
      }
  >({
    key: `generateResponse ${initialData.id}`,
  });

  const [selectedChunks, setSelectedChunks] = useState<SelectorData[]>(() => {
    if (initialData?.type === "cached") {
      const chunks =
        (initialData as CacheGroup).chunks?.map((item) => ({
          region: item.region,
          chunkId: item.chunk_id,
          document: null,
          title: null,
          chunk: null,
        })) ?? [];

      return [...new Set(chunks)];
    }

    return [];
  });

  const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
    if (initialData?.type === "cached") {
      return (initialData as CacheGroup).topics ?? [];
    }

    if (initialData?.type === "question") {
      return [(initialData as UserQuestion)?.topic_id];
    }

    return [];
  });

  const regionChunkIdMap = selectedChunks.reduce(
    (acc, item) => {
      acc[item.region] = acc[item.region] ?? [];
      if (item.chunkId) {
        acc[item.region].push(item.chunkId);
      }

      return acc;
    },
    {} as Record<string, string[]>,
  );

  useEffect(() => {
    if (responseFetcher.data?.success === true) {
      if (
        Object.keys(responseFetcher.data?.response ?? {}).length > 0 &&
        responseFetcher.data?.response !== generatedResponses
      ) {
        setGeneratedResponses(responseFetcher.data?.response ?? {});
      }
    }
  }, [responseFetcher.data, generatedResponses]);

  const legal =
    (initialData?.type === "userQuestion" &&
      (initialData as UserQuestion)?.legislative) ||
    false;

  return (
    <Card className="h-fit">
      <CardContent className="space-y-4 p-4 pt-2 relative">
        <button
          type="button"
          className="absolute top-2 right-2"
          onClick={() => {
            toast.info(
              "No se ha implementado la funcionalidad de eliminar preguntas",
              { duration: 50000 },
            );
          }}
        >
          <X className="h-6 w-6" />
        </button>
        <Form
          method="PUT"
          id={`edit-card-${initialData.id}`}
          preventScrollReset={true}
        >
          <input type="hidden" name="id" value={initialData?.id} />
          <input type="hidden" name="type" value={initialData.type} />

          <div className="row-[auto_auto] mx-auto grid grid-cols-3 gap-x-2 gap-y-2 bg-[#fff] mb-2">
            <div className="flex flex-col">
              {initialData?.type === "cached" && (
                <div className=" text-sm font-light text-green-700 pb-2">
                  <Check className="mr-2 inline h-4 w-4" />
                  En cache
                </div>
              )}
              <div>
                <Input
                  id="pregunta"
                  name="pregunta"
                  placeholder="Pregunta"
                  defaultValue={question ?? ""}
                  onChange={(e) => setQuestion(e.target.value)}
                  list="questions"
                />
                {(questions ?? []).length > 0 && (
                  <datalist id="questions">
                    {distinct(questions ?? [])?.map((item) => (
                      <option
                        key={item + (initialData?.id ?? "0")}
                        value={item}
                      />
                    ))}
                  </datalist>
                )}

                <div className="mt-2 text-sm font-light">
                  <label htmlFor="">
                    Selector de Tema
                    <MultipleSelector
                      className="mt-1"
                      options={topics}
                      onChange={(e) => {
                        setSelectedTopics(e.map((item) => item.value));
                      }}
                      badgeClassName="bg-slate-200 text-slate-900 rounded-md hover:bg-red-200 hover:text-red-900"
                      value={selectedTopics.map((item) => ({
                        value: item,
                        label: item,
                      }))}
                    />
                    <input
                      type="hidden"
                      name="topics"
                      value={JSON.stringify(selectedTopics)}
                    />
                    <input
                      type="hidden"
                      name="chunks"
                      value={
                        Object.keys(regionChunkIdMap).length > 0
                          ? JSON.stringify(regionChunkIdMap)
                          : ""
                      }
                    />
                  </label>
                </div>
                <div className="flex space-x-2">
                  {legal && <Badge variant="default">Legal</Badge>}

                  <pre className="ml-1 mt-1 text-xs font-light text-gray-500">
                    {initialData?.type === "question" &&
                      `${(initialData as UserQuestion)?.userEmail}`}
                  </pre>
                </div>
                <pre className="ml-1 mt-1 text-xs font-light text-gray-500">
                  {initialData?.id && `ID: ${initialData?.id} | `}
                  {initialData?.created_at &&
                    `Creado: ${getPrettyTime(initialData.created_at)}`}
                </pre>
              </div>
            </div>
            <div className="col-span-2 flex justify-between gap-x-4">
              <Responses responses={generatedResponses} />

              <div className="flex flex-col gap-y-3">
                <Button
                  variant={"outline"}
                  type="submit"
                  form={`edit-card-${initialData.id}`}
                >
                  Guardar
                </Button>
                <responseFetcher.Form
                  action="/generate-response"
                  method="POST"
                  id="generate-responses"
                >
                  <Button
                    variant="outline"
                    type="button"
                    className="max-w-[100px] whitespace-break-spaces"
                    onClick={() => {
                      if (!question) {
                        toast.error("La pregunta no puede estar vacía");
                        return;
                      }

                      if (Object.keys(regionChunkIdMap).length === 0) {
                        toast.error("Selecciona al menos un fragmento");
                        return;
                      }

                      responseFetcher.submit(
                        {
                          question: question,
                          chunks: JSON.stringify(regionChunkIdMap),
                        },
                        {
                          method: "POST",
                          action: "/generate-response",
                        },
                      );
                    }}
                  >
                    {responseFetcher.state !== "idle"
                      ? "Generando..."
                      : responseFetcher.data?.success === true
                        ? "Recrear respuesta"
                        : "Crear respuesta"}
                  </Button>
                </responseFetcher.Form>
              </div>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-x-2 gap-y-2 bg-[#fff]">
            {/* <SimilarQuestionsSelector
                question={initialData?.question || ""}
                similarQuestions={similarQuestions}
                setSimilarQuestions={setSimilarQuestions}
              /> */}
            <div className="col-span-2 flex w-full rounded-lg border p-2">
              <ChunkSelector
                chunkSelectorData={chunkSelectorData}
                regions={regions}
                selectedChunks={selectedChunks}
                setSelectedChunks={setSelectedChunks}
              />
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
