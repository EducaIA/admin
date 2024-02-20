import * as cache from "./cache";
import { embedding_subchunk } from "./embedding_subchunk";
import * as messages from "./messages";
import * as oposiciones from "./oposiciones";
import { users } from "./user";

export const schema = {
  ...messages,
  ...oposiciones,
  users,
  ...cache,
};

export const data_db_schema = {
  embedding_subchunk,
};
