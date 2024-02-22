import { type ClassValue, clsx } from "clsx";

import { twMerge } from "tailwind-merge";
import { z } from "zod";
import { json } from "~/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getPrettyTime = (date: Date) => {
  return new Date(date).toLocaleString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const accentsMap = new Map<string, string>([
  ["-", "\\s|\\.|_"],
  ["a", "á|à|ã|â|ä"],
  ["e", "é|è|ê|ë"],
  ["i", "í|ì|î|ï"],
  ["o", "ó|ò|ô|õ|ö"],
  ["u", "ú|ù|û|ü"],
  ["c", "ç"],
  ["n", "ñ"],
]);

const reducer = (acc: string, [key, _]: [string, string]) =>
  acc.replace(new RegExp(accentsMap.get(key) || "", "gi"), key);

export const slugify = (text: string) =>
  [...accentsMap].reduce(reducer, text.toLowerCase());

export const cosineSimilarity = (vectorA: number[], vectorB: number[]) => {
  const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
  const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

export const prettifyName = (name: string) => {
  return name
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
};

export const convertDateToLocal = (date: string) => {
  const localDate = new Date(`${date}Z`).toLocaleString("en-US", {
    localeMatcher: "best fit",
    timeZoneName: "short",
  });

  return localDate;
};

export const distinct = <T>(array: T[]) => {
  return [...new Set(array)];
};

export function timeWrapped<A extends unknown[], R>(
  someFunction: (...a: A) => Promise<R>,
  name?: string
) {
  const wrappedFunction = async (...args: A) => {
    console.time(`Time Elapsed for ${name ?? someFunction.name}"`);
    const result = await someFunction(...args);
    console.timeEnd(`Time Elapsed for ${name ?? someFunction.name}"`);
    return result;
  };
  return wrappedFunction;
}

export const stringToJSONSchema = z
  .string()
  .transform((str, ctx): z.infer<ReturnType<typeof json>> => {
    try {
      return JSON.parse(str);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: "Invalid JSON" });
      return z.NEVER;
    }
  });
