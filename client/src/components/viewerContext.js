import { createContext, useContext } from "react";

export const ViewerContext = createContext(null);

export function useViewerContext() {
  return useContext(ViewerContext);
}
