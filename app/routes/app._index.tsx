import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, Layout, Text, Card, BlockStack, MediaCard, VideoThumbnail, ExceptionList } from "@shopify/polaris";
import {NoteIcon} from '@shopify/polaris-icons';
import { authenticate } from "../shopify.server";
import { getEDDStats } from "~/data/api";

export const loader = async ({ request }: LoaderFunctionArgs) => {

  await authenticate.admin(request);
  let url = new URL(request.url);
  let store_url = url.searchParams.get('shop') ?? '';
  let payload = { product_variant_id:"42443883282623", destination_pincode:"641005", origin_pincodes: ["641001"] }
  let response = await getEDDStats(payload, store_url);
  console.log('response :', response);
  return null;
};

export default function Index() {

  const videoThumbnailUrl = 'https://img.youtube.com/vi/PPHsGfNswjc/maxresdefault.jpg';
  const videoUrl = 'https://www.youtube.com/watch?v=PPHsGfNswjc';

  return (
    <Page>
      {/* <ui-title-bar title="eShipz Estimated Delivery Date"></ui-title-bar> */}
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd"> Consider the below screencast while embedding this app into your store theme </Text>
                  <Text variant="bodyMd" as="p"> contact support@eshipz.com to activate your app and if any assistance needed </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                <MediaCard
                  title="Keep customers informed & convert curiosity into sales"
                  description={`In this video tutorial, you’ll be learning how to integrate your eShipz Estimated Delivery Date App with you theme store.`}
                >
                  <VideoThumbnail
                    videoLength={80}
                    thumbnailUrl={videoThumbnailUrl}
                    onClick={() => window.open(videoUrl, '_blank')}
                  />
                </MediaCard>
                <ExceptionList items={[{ icon: NoteIcon, description: 'This app is only supported with themes that contain JSON templates, also known as Online Store 2.0 themes.' }]} />
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
