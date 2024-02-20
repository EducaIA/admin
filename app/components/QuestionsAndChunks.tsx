import { getExistingCacheGroups, getUserQuestions } from "~/server/db";
import { QuestionCard } from "./QuestionCard";
import { FullChunkSelectorData } from "~/types";

export default async function QuestionsAndChunks({
  regions,
  chunkData,
  formattedTopics,
  searchParams,
}: {
  regions: string[];
  chunkData: FullChunkSelectorData;
  formattedTopics: { value: string; label: string; id: number }[];
  searchParams: {
    search?: string;
    page?: string;
    showing?: string;
    questionType?: string;
  };
}) {
  const [questions, cacheGroups] = await Promise.all([
    ["all", "non-cached"].includes(searchParams?.showing ?? "all")
      ? getUserQuestions(
          (searchParams?.questionType ?? "") === "legislativas",
          Number(searchParams.page) || 0,
        )
      : Promise.resolve([]),
    ["all", "cached"].includes(searchParams?.showing ?? "all")
      ? getExistingCacheGroups({
          search: searchParams.search,
          page: Number(searchParams.page),
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      {questions.map((item) => (
        <QuestionCard
          key={item.id}
          initialData={item}
          topics={formattedTopics}
          regions={regions}
          chunkSelectorData={chunkData}
          type="new"
        />
      ))}

      {cacheGroups.map((item) => (
        <QuestionCard
          key={item.id}
          initialData={item}
          topics={formattedTopics}
          regions={regions}
          chunkSelectorData={chunkData}
          questions={questions
            .map((item) => item.question)
            .filter((question): question is string => question !== null)}
          type="edit"
        />
      ))}
    </>
  );
}
