/**
 * Product service for fetching products and variants from Shopify
 */

export interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string | null;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  variants: ShopifyVariant[];
}

export interface ShopifyCollection {
  id: string;
  title: string;
}

export type FilterType = "all" | "collection" | "vendor" | "productType" | "tag";

/**
 * Fetch all collections with pagination
 */
export async function fetchCollections(
  graphql: any
): Promise<ShopifyCollection[]> {
  const collections: ShopifyCollection[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const response = await graphql(GET_COLLECTIONS, {
      variables: { cursor },
    });

    const data: any = await response.json();
    if (data?.data?.collections) {
      collections.push(
        ...data.data.collections.edges.map((edge: any) => edge.node)
      );
      hasNextPage = data.data.collections.pageInfo.hasNextPage;
      cursor = data.data.collections.pageInfo.endCursor;
    } else {
      hasNextPage = false;
    }
  }

  return collections;
}

/**
 * Fetch all products with pagination
 */
export async function fetchAllProducts(
  graphql: any
): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const response = await graphql(GET_ALL_PRODUCTS, {
      variables: { cursor },
    });

    const data: any = await response.json();
    if (data?.data?.products) {
      const productsData = data.data.products.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        variants: edge.node.variants.edges.map((v: any) => v.node),
      }));
      products.push(...productsData);
      hasNextPage = data.data.products.pageInfo.hasNextPage;
      cursor = data.data.products.pageInfo.endCursor;
    } else {
      hasNextPage = false;
    }
  }

  return products;
}

/**
 * Fetch products from a collection with pagination
 */
export async function fetchProductsByCollection(
  graphql: any,
  collectionId: string
): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const response = await graphql(GET_PRODUCTS_BY_COLLECTION, {
      variables: { collectionId, cursor },
    });

    const data: any = await response.json();
    if (data?.data?.collection?.products) {
      const productsData = data.data.collection.products.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        variants: edge.node.variants.edges.map((v: any) => v.node),
      }));
      products.push(...productsData);
      hasNextPage = data.data.collection.products.pageInfo.hasNextPage;
      cursor = data.data.collection.products.pageInfo.endCursor;
    } else {
      hasNextPage = false;
    }
  }

  return products;
}

/**
 * Fetch products by vendor, product type, or tag using Shopify's query language
 */
export async function fetchProductsByFilter(
  graphql: any,
  filterType: FilterType,
  filterValue: string
): Promise<ShopifyProduct[]> {
  let queryString = "";
  if (filterType === "vendor") queryString = `vendor:'${filterValue}'`;
  else if (filterType === "productType") queryString = `product_type:'${filterValue}'`;
  else if (filterType === "tag") queryString = `tag:'${filterValue}'`;
  else return [];

  const products: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const response = await graphql(GET_PRODUCTS_BY_QUERY, {
      variables: { query: queryString, cursor },
    });
    const data: any = await response.json();
    if (data?.data?.products) {
      const productsData = data.data.products.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        variants: edge.node.variants.edges.map((v: any) => v.node),
      }));
      products.push(...productsData);
      hasNextPage = data.data.products.pageInfo.hasNextPage;
      cursor = data.data.products.pageInfo.endCursor;
    } else {
      hasNextPage = false;
    }
  }

  return products;
}

/**
 * Fetch distinct product vendors from the store
 */
export async function fetchProductVendors(graphql: any): Promise<string[]> {
  try {
    const response = await graphql(GET_VENDORS_AND_TYPES);
    const data: any = await response.json();
    const vendors = data?.data?.shop?.productVendors?.edges?.map((e: any) => e.node) ?? [];
    return vendors.filter(Boolean).sort();
  } catch {
    return [];
  }
}

/**
 * Fetch distinct product types from the store
 */
export async function fetchProductTypes(graphql: any): Promise<string[]> {
  try {
    const response = await graphql(GET_VENDORS_AND_TYPES);
    const data: any = await response.json();
    const types = data?.data?.shop?.productTypes?.edges?.map((e: any) => e.node) ?? [];
    return types.filter(Boolean).sort();
  } catch {
    return [];
  }
}

/**
 * Retries up to 3 times with exponential backoff on 429 / THROTTLED responses.
 */
export async function updateProductVariants(
  graphql: any,
  productId: string,
  variants: { id: string; price: string; compareAtPrice?: string | null }[]
): Promise<{ success: boolean; errors?: string[] }> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await graphql(BULK_UPDATE_VARIANTS, {
        variables: { productId, variants },
      });

      const data: any = await response.json();

      // Shopify GraphQL throttle signals THROTTLED in extensions even on HTTP 200
      const isThrottled = data?.errors?.some(
        (e: any) => e?.extensions?.code === "THROTTLED"
      );
      if (isThrottled) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.log(`[Retry] Throttled on ${productId}, retrying in ${delay}ms (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        return { success: false, errors: ["Shopify API throttled — max retries reached"] };
      }

      if (data?.data?.productVariantsBulkUpdate) {
        if (data.data.productVariantsBulkUpdate.userErrors.length > 0) {
          return {
            success: false,
            errors: data.data.productVariantsBulkUpdate.userErrors.map(
              (e: any) => e.message
            ),
          };
        }
        return { success: true };
      }

      return { success: false, errors: ["No response data"] };
    } catch (error: any) {
      const isRateLimit =
        error?.status === 429 ||
        String(error?.message).includes("429") ||
        String(error?.message).includes("Throttled");

      if (isRateLimit && attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`[Retry] 429 on ${productId}, retrying in ${delay}ms (${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Update failed"],
      };
    }
  }

  return { success: false, errors: ["Max retries exceeded"] };
}

// GraphQL Queries

const GET_PRODUCTS_BY_QUERY = `
  query GetProductsByQuery($query: String!, $cursor: String) {
    products(first: 50, after: $cursor, query: $query) {
      edges {
        node {
          id
          title
          variants(first: 50) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const GET_VENDORS_AND_TYPES = `
  query GetVendorsAndTypes {
    shop {
      productVendors(first: 250) { edges { node } }
      productTypes(first: 250) { edges { node } }
    }
  }
`;

const GET_COLLECTIONS = `
  query GetCollections($cursor: String) {
    collections(first: 50, after: $cursor) {
      edges {
        node {
          id
          title
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const GET_ALL_PRODUCTS = `
  query GetAllProducts($cursor: String) {
    products(first: 50, after: $cursor) {
      edges {
        node {
          id
          title
          variants(first: 50) {
            edges {
              node {
                id
                title
                price
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const GET_PRODUCTS_BY_COLLECTION = `
  query GetProductsByCollection($collectionId: ID!, $cursor: String) {
    collection(id: $collectionId) {
      products(first: 50, after: $cursor) {
        edges {
          node {
            id
            title
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  price
                  compareAtPrice
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const BULK_UPDATE_VARIANTS = `
  mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
        compareAtPrice
      }
      userErrors {
        field
        message
      }
    }
  }
`;
