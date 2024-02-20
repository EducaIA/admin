import { type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/.server/auth";

export const loader = ({ request }: LoaderFunctionArgs) => {
  return authenticator.authenticate("google", request, {
    successRedirect: "/",
    failureRedirect: "/login",
  });
};
