import {
  ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  json,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { promiseHash } from "remix-utils/promise";
import { Navbar } from "~/components/Navbar";
import QuestionCreator from "~/components/QuestionCreator";
import {
  getChunkData,
  getExistingCacheGroups,
  getMessageTypes,
  getOposiciones,
  getTopics,
  getUserQuestions,
} from "~/server/db/queries";

import { useEffect } from "react";
import { getToast } from "remix-toast";
import { toast as notify } from "sonner";
import { authenticator } from "~/.server/auth";
import { runCreateQuestionAction } from "~/actions/create-question";
import { runEditQuestionAction } from "~/actions/edit-question";
import Paginator from "~/components/Paginator";
import { QuestionCard } from "~/components/QuestionCard";

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

  const { toast, headers } = await getToast(request);
  const onlyLegislative = params.get("questionType") === "legislativas";

  const questionType = params.get("messageType") ?? "all";

  let questionsPromise = getUserQuestions(
    onlyLegislative,
    Number(page) - 1,
    questionType,
  );
  let cacheGroupsPromise = getExistingCacheGroups({
    page: Number(page) - 1,
  });

  if (params.get("showing") === "cached") {
    questionsPromise = Promise.resolve([]);
  } else if (params.get("showing") === "non-cached") {
    cacheGroupsPromise = Promise.resolve([]);
  }

  return json(
    await promiseHash({
      chunkData: getChunkData(),
      topics: getTopics(),
      messageTypes: getMessageTypes(),
      oposiciones: getOposiciones(),
      questions: questionsPromise,
      cacheGroups: cacheGroupsPromise,
      toast: Promise.resolve(toast),
    }),
    { headers },
  );
};

export default function Index() {
  const { chunkData, topics, messageTypes, questions, cacheGroups, toast } =
    useLoaderData<typeof loader>();

  const regions = Object.keys(chunkData);

  const formattedTopics = (topics ?? [])
    .map((t) => ({
      value: t.title,
      label: t.title,
      id: t.id,
    }))
    .sort((a, b) => a.id - b.id);

  const fullList = [...questions, ...cacheGroups];

  fullList.sort((a, b) => {
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  useEffect(() => {
    if (toast) {
      notify[toast.type as "info" | "success" | "error" | "warning"](
        toast.message,
      );
    }
  }, [toast]);

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
