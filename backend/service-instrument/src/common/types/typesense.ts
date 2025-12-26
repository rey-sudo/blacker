const instrumentFields = [
  // Required primary key for typesense
  { name: "id", type: "string" },

  // Business identifiers
  { name: "internalId", type: "string", index: false },

  // Searchable fields
  { name: "symbol", type: "string" },
  { name: "description", type: "string", optional: true },

  // Filterable / faceted fields
  { name: "base", type: "string", facet: true },
  { name: "quote", type: "string", facet: true },
  { name: "exchange", type: "string", facet: true },
  { name: "market", type: "string", facet: true },
  { name: "type", type: "string", facet: true }, // spot | futures | other

  // Optional identifiers
  { name: "isin", type: "string", optional: true, index: false },
  { name: "cusip", type: "string", optional: true, index: false },
];

export const INSTRUMENTS_COLLECTION = "instruments";

export const instrumentsSchema = {
  name: INSTRUMENTS_COLLECTION,
  fields: instrumentFields,
};
