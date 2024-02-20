import {
  ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { promiseHash } from "remix-utils/promise";
import { Navbar } from "~/components/Navbar";
import QuestionCreator from "~/components/QuestionCreator";
import {
  getExistingCacheGroups,
  getMessageTypes,
  getOposiciones,
  getTopics,
  getUserQuestions,
} from "~/server/db";
import { getChunkData } from "~/server/db/data_db";
import { authenticator } from "~/.server/auth";
import { QuestionCard } from "~/components/QuestionCard";
import Paginator from "~/components/Paginator";
import { runCreateQuestionAction } from "~/actions/create-question";
import { runEditQuestionAction } from "~/actions/edit-question";
import { Toaster } from "sonner";

export const meta: MetaFunction = () => {
  return [{ title: "Educaia - Admin" }];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();

  if (request.method === "POST") {
    return runCreateQuestionAction(formData);
  }

  if (request.method === "PUT") {
    return runEditQuestionAction(formData);
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticator.authenticate("google", request, {
    failureRedirect: "/login",
  });

  const params = new URL(request.url).searchParams;

  const page = params.get("page") ?? "1";

  return json(
    await promiseHash({
      chunkData: getChunkData(),
      topics: getTopics(),
      messageTypes: getMessageTypes(),
      oposiciones: getOposiciones(),
      questions: getUserQuestions(false, Number(page) - 1),
      cacheGroups: getExistingCacheGroups({
        page: Number(page) - 1,
      }),
    }),
  );
};

export default function Index() {
  const { chunkData, topics, messageTypes, questions, cacheGroups } =
    useLoaderData<typeof loader>();

  const regions = Object.keys(chunkData);

  const formattedTopics = (topics ?? [])
    .map((t) => ({
      value: t.title,
      label: t.title,
      id: t.id,
    }))
    .sort((a, b) => a.id - b.id);

  const [searchParams, setSearchParams] = useSearchParams();

  let fullList = [];

  if (searchParams.get("showing") === "cached") {
    fullList = cacheGroups;
  } else if (searchParams.get("showing") === "non-cached") {
    fullList = questions;
  } else {
    fullList = [...questions, ...cacheGroups];
  }

  fullList.sort((a, b) => {
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  return (
    <div className="h-full">
      <div className="sticky top-0 z-50 flex w-full flex-row justify-between border-b bg-background p-3">
        <Navbar
          messageTypes={messageTypes}
          lastIdSeen={{
            questions: questions[questions.length - 1]?.id ?? 0,
            cacheGroups: cacheGroups[cacheGroups.length - 1]?.id ?? 0,
          }}
        />
      </div>
      <div className="h-full mx-auto grid w-full grid-rows-[auto_1fr] gap-y-4 overflow-auto bg-stone-50 p-2 sm:px-4 md:py-4">
        <QuestionCreator
          chunkData={chunkData}
          topics={formattedTopics}
          regions={regions}
        />

        {fullList.map((item) => (
          <QuestionCard
            key={item.id}
            regions={regions}
            topics={formattedTopics}
            chunkSelectorData={chunkData}
            initialData={item as any}
          />
        ))}

        <Paginator />
      </div>
    </div>
  );
}
