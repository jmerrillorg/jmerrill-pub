// components/MetaHead.tsx
import Head from "next/head";
import { useRouter } from "next/router";

interface MetaHeadProps {
  title: string;
  description: string;
  image?: string;
}

const MetaHead: React.FC<MetaHeadProps> = ({ title, description, image }) => {
  const router = useRouter();
  const siteUrl = "https://www.jmerrill.pub";
  const canonicalUrl = `${siteUrl}${router.asPath}`;
  const ogImage = image || `${siteUrl}/logo.jpg`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
};

export default MetaHead;