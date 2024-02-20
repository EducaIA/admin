
import { useEffect, useState } from "react";

import { FullChunkSelectorData } from "~/types";

import { toast } from "sonner";

import { distinct } from "~/utils/utils";
import { CacheGroup, UserQuestion } from "~/server/db";

import ChunkSelector, { type SelectorData } from "./ChunkSelector";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import MultipleSelector from "./ui/multiple-selector";
import { Textarea } from "./ui/textarea";
import { Form, useFetcher } from "@remix-run/react";

const Responses = ({ responses }: { responses: Record<string, string> }) => {
  const renderTextarea = (region: string, text: string) => (
    <div key={region} className="w-full">
      <Label htmlFor={`respuesta-${region}`} className="ml-1 capitalize">
        {region}
      </Label>
      <Textarea
        className="read-only:bg-grey-100"
        id={`respuesta-${region}`}
        name={`respuesta-${region}`}
        defaultValue={text}
        rows={Math.min(text.split("\n").length, 10)}
      />
    </div>
  );

  const responseKeys = Object.keys(responses);
  return (
    <div className="flex w-full flex-col gap-y-3">
      {responseKeys.length === 0
        ? renderTextarea("nacional", "")
        : responseKeys.map((region) =>
            renderTextarea(region, responses[region]),
          )}
    </div>
  );
};

export function CreateQuestionCard({
  regions,
  questions,
  topics,
  chunkSelectorData,
  type,
}: {
  initialData?: UserQuestion | CacheGroup;
  regions: string[];
  questions?: string[];
  topics: { value: string; label: string }[];
  chunkSelectorData: FullChunkSelectorData;
  type?: "new" | "edit";
}) {
  const [question, setQuestion] = useState<string>();

  const responseFetcher = useFetcher<
    | {
        success: true;
        responses: Record<string, string>;
      }
    | {
        success: false;
        error: {
          issues: { message: string }[];
        };
      }
  >({
    key: "generateResponse",
  });

  const [selectedChunks, setSelectedChunks] = useState<SelectorData[]>([]);

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const regionChunkIdMap = selectedChunks.reduce<Record<string, string[]>>(
    (acc, item) => {
      acc[item.region] = acc[item.region] ?? [];

      if (item.chunkId) {
        acc[item.region].push(item.chunkId);
      }

      return acc;
    },
    {},
  );

  useEffect(() => {
    if (responseFetcher.data?.success === false) {
      const issues = responseFetcher.data.error.issues
        .map((x) => x.message)
        .join(", ");
      toast.error(`Ha ocurrido un error. ${issues}`);
    }
  }, [responseFetcher.data]);

  return (
    <Card className="h-fit">
      <CardContent className="space-y-4 p-4 pt-2">
        <Form method="PUT" id="create-question">
          <div className="row-[auto_auto] mx-auto grid grid-cols-3 gap-x-2 gap-y-2 bg-[#fff]">
            <div className="flex flex-col justify-between">
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
                      <option key={item} value={item} />
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
                  </label>
                </div>
              </div>
            </div>
            <div className="col-span-2 flex justify-between gap-x-4">
              <input
                type="hidden"
                name="chunks"
                value={
                  Object.keys(regionChunkIdMap).length > 0
                    ? JSON.stringify(regionChunkIdMap)
                    : ""
                }
              />
              <input
                type="hidden"
                name="answer"
                value={
                  Object.keys(regionChunkIdMap).length > 0
                    ? JSON.stringify(regionChunkIdMap)
                    : ""
                }
              />
              <Responses
                responses={
                  responseFetcher.data?.success === true
                    ? responseFetcher.data.responses
                    : {}
                }
              />

              <div className="flex flex-col gap-y-3">
                <Button
                  variant={"outline"}
                  type="submit"
                  form="create-question"
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
        </Form>
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
      </CardContent>
    </Card>
  );
}

export default function QuestionCreator({
  chunkData,
  topics,
  regions,
}: {
  chunkData: FullChunkSelectorData;
  regions: string[];
  topics: {
    value: string;
    label: string;
  }[];
}) {
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);

  const toggleCreatingQuestion = () => setIsCreatingQuestion((prev) => !prev);

  return isCreatingQuestion ? (
    <CreateQuestionCard
      regions={regions}
      chunkSelectorData={chunkData}
      topics={topics}
    />
  ) : (
    <div className="flex w-full justify-center">
      <Button variant="outline" onClick={toggleCreatingQuestion}>
        Crear pregunta
      </Button>
    </div>
  );
}
