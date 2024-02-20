import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { authenticator } from "~/.server/auth";

export const loader = () => redirect("/login");

export const action = ({ request }: ActionFunctionArgs) => {
  return authenticator.authenticate("google", request);
};
