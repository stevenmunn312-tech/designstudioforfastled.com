// Stands in for the app's `state/graphStore` inside the engine bundle.
//
// The real module is the editor's whole project store (React Flow, upload
// state, persistence, the bundled pattern library) and would pull most of the
// app into the site. The evaluator reads only two things from it at runtime:
// display documents (for display-design nodes) and graph names (for show
// nodes). Neither exists in a single shared pattern, so both are empty here.
export const useGraphStore = {
  getState: () => ({ displayDocuments: {}, graphs: [] }),
};
