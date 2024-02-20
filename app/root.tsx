import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import { Toaster } from "sonner";

import "./tailwind.css";

// export const links: LinksFunction = () => [
//   ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
//   ...(process.env.NODE_ENV === "development"
//     ? [{ rel: "stylesheet", href: rdtStylesheet }]
//     : []),
//   { rel: "stylesheet", href: stylesheet },
// ];

function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

let AppExport = App;
// This imports the dev tools only if you're in development
if (process.env.NODE_ENV === "development") {
  const { withDevTools } = await import("remix-development-tools");
  AppExport = withDevTools(AppExport);
}

export default AppExport;
