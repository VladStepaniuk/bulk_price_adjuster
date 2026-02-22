import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Text,
  BlockStack,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const id = parseInt(params.id || "0");

  const campaign = await db.adjustmentCampaign.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { productTitle: "asc" }
      }
    }
  });

  if (!campaign) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ campaign });
};

export default function HistoryDetailPage() {
  const { campaign } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const rows = campaign.logs.map((log) => [
    log.productTitle,
    log.variantTitle,
    `${log.oldPrice.toFixed(2)}`,
    `${log.newPrice.toFixed(2)}`,
    `${(log.newPrice - log.oldPrice).toFixed(2)}`,
  ]);

  return (
    <Page
      title={`Price Change Details`}
      subtitle={new Date(campaign.executedAt || campaign.createdAt).toLocaleString()}
      backAction={{ content: "History", onAction: () => navigate("/app/history") }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Modified Variants</Text>
              <DataTable
                columnContentTypes={["text", "text", "numeric", "numeric", "numeric"]}
                headings={["Product", "Variant", "Old Price", "New Price", "Difference"]}
                rows={rows}
                pagination={{
                  hasNext: false,
                  hasPrevious: false,
                }}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
