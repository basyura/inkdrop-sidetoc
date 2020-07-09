"use babel";

import * as Flux from "flux";
import { DispatchAction } from "./types";

export default new Flux.Dispatcher<DispatchAction>();
