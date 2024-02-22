const MICROSERVICES_URL = process.env.MICROSERVICES_URL;
const API_KEY = process.env.INTERNAL_API_KEY;

export const MicroservicesClient = {
  createUrl: (endpoint: string) =>
    new URL(endpoint, MICROSERVICES_URL).toString(),
  get: async <T = unknown>(
    endpoint: string,
    options: {
      jwt?: string;
      query?: Record<string, string | number | string[]>;
      cache?: RequestCache;
      onError?: (error: Error) => void;
      defaultData?: T;
    } = {}
  ) => {
    const url = new URL(endpoint, MICROSERVICES_URL);

    const { query, defaultData } = options;

    if (query) {
      for (const key in query) {
        if (Array.isArray(query[key])) {
          url.searchParams.append(
            key,
            (query[key] as (string | number)[])
              .map((x) => x.toString())
              .join(",")
          );
          continue;
        }
        url.searchParams.append(key, String(query[key]));
      }
    }

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.jwt ? { Authorization: `Bearer ${options.jwt}` } : {}),
        },
        cache: options.cache || "default",
      });

      if (!res.ok) {
        const rest_text = await res.text();
        console.error("Error:", rest_text);

        if (defaultData) return defaultData;
        if (res.status > 405) {
          throw new Error("Network response was not ok");
        }
      }

      return res.json() as Promise<T>;
    } catch (error) {
      if (defaultData) {
        return defaultData;
      }

      throw error;
    }
  },
  post: async <T = unknown>(
    endpoint: string,
    body?: Record<string, unknown>,
    options?: {
      api_key?: string;
    }
  ) => {
    const url = new URL(endpoint, MICROSERVICES_URL).toString();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": options?.api_key ?? API_KEY ?? "",
        },
        body: body ? JSON.stringify(body) : null,
      });

      if (!res.ok) {
        console.error("Error:", await res.text());
        throw new Error("Network response was not ok");
      }

      return res.json() as Promise<T>;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  },
};
